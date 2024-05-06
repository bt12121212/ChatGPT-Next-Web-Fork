import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX, ACCESS_USER_PREFIX, ModelProvider } from "../constant";


const SERVER_CONFIG = getServerSideConfig();
if (!SERVER_CONFIG.dbUrl || !SERVER_CONFIG.dbToken) {
  throw new Error(
    "Database URL or Token is not defined in environment variables.",
  );
}
const DB_URL = SERVER_CONFIG.dbUrl as string; // 类型断言
const DB_TOKEN = SERVER_CONFIG.dbToken as string; // 类型断言

function getIP(req: NextRequest) {
  let ip = req.ip ?? req.headers.get("x-real-ip");
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (!ip && forwardedFor) {
    ip = forwardedFor.split(",").at(0) ?? "";
  }

  return ip;
}

function parseApiKey(bearToken: string) {
  const token = bearToken.trim().replaceAll("Bearer ", "").trim();
  const isOpenAiKey = !token.startsWith(ACCESS_CODE_PREFIX);
  const isUserToken = token.startsWith(ACCESS_USER_PREFIX);

  if (isUserToken) {
    //新增是不是通过用户名登录
    return {
      accUserInfo: token.slice(ACCESS_USER_PREFIX.length),
      accessCode: "",
      apiKey: "",
    };
  }
  return {
    accessCode: isOpenAiKey ? "" : token.slice(ACCESS_CODE_PREFIX.length),
    apiKey: isOpenAiKey ? token : "",
    accUserInfo: "", // 当token不是用户token时，这里返回空字符串
  };
}

export async function fetchDB( //返回json
  method: string,
  userInfo: any,
): Promise<{ [key: string]: any }> {
  try {
    let sendDBmsg;

    switch (method) {
      case "GET":
        // 获取用户数据
        sendDBmsg = ["HGET", "zwxzUserData", userInfo.username];
        break;
      case "SET":
        /* 
        JSON.parse(user)用户数据示例：
        {
          uid: "1",
          username: "1",
          password: "c4ca4238a0b923820dcc509a6f75849b",
          tokens: ["6512bd43d9caa6e02c990b0a82652dca"],
          loginHistory: [
            {
              time: "2023-08-23T10:35:20.410Z",
              IP: "192.168.22.62"
            }
          ]
        } */
        sendDBmsg = [
          "HSET",
          "zwxzUserData",
          userInfo.username,
          JSON.stringify(userInfo),
        ];
        break;
      default:
        throw new Error("Unsupported method");
    }

    const response = await fetch(DB_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DB_TOKEN}`,
      },
      body: JSON.stringify(sendDBmsg),
    });
    if (method === "GET") {
      const data = await response.text();
      const parsedData = JSON.parse(data);
      if (parsedData.result) {
        return JSON.parse(parsedData.result);
      } else {
        return JSON.parse(data);
      }
    } else {
      return await response.json();
    }
  } catch (error) {
    return { error: true, msg: (error as Error).message };
  }
}


// 执行前端登录函数
export async function performLogin(username: string, password: string) {
  //此处password为md5.hash(password)的结果
  const user = await fetchDB("GET", { username: username });

  // 判断user是否存在，并且传入的密码是否与存储在数据库中的密码匹配
  if (user && password === user.password) {
    const storageUser = {
      username: username,
      password: password,
      token: setToken(username),
    };
    return { valid: true, user: JSON.stringify(storageUser) }; // 在这里，我们返回了user 用户名和token的JSON.stringify
  } else {
    return { valid: false, error: "Invalid username or password" };
  }
}


export async function setToken(username: string) {
  const token = md5.hash(new Date().toISOString() + username);
  return token;
}
function getBeijingTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000; // 获取当前时区偏移的毫秒数
  const beijingOffset = 8 * 60 * 60 * 1000; // 北京时区偏移的毫秒数
  return new Date(now.getTime() + offset + beijingOffset);
}


export async function auth(req: NextRequest, modelProvider: ModelProvider): Promise<{ error: boolean; msg?: string } | undefined>  {
  const authToken = req.headers.get("Authorization") ?? "";
  const { accessCode, apiKey: token, accUserInfo } = parseApiKey(authToken);

  const hashedCode = md5.hash(accessCode ?? "").trim();
  const serverConfig = getServerSideConfig();

  console.log("[Auth] allowed hashed codes: ", [...SERVER_CONFIG.codes]);
  console.log("[Auth] got access code:", accessCode);
  console.log("[Auth] hashed access code:", hashedCode);
  console.log("[User IP] ", getIP(req));
  console.log("[Time] ", new Date().toLocaleString());
  console.log("[Auth] Accuserinfo:", accUserInfo);

  if (accUserInfo) {
    // 解析accUserInfo以获取用户名、密码和token
    const { username, password, token } = JSON.parse(accUserInfo);

    // 直接使用fetchDB获取用户数据
    const user = await fetchDB("GET", { username: username });
    if (user && password === user.password) {
      if (!user.tokens) {
        user.tokens.push(token);
      } else if (user.tokens && !user.tokens.includes(token)) {
        // 如果服务器中的token记录达到了10条，移除最早的一条
        if (user.tokens && user.tokens.length >= 10) {
          user.tokens.shift();
        }
        // 将用户的新token添加到服务器的token记录中
        user.tokens.push(token);
      }
      const IP = getIP(req);
      if (!user.loginHistory) {
        user.loginHistory = []; // Ensure loginHistory property exists
      }
      const beijingTime = getBeijingTime();
      user.loginHistory.push({
        time: beijingTime.toLocaleString(),
        IP: IP,
      });

      try {
        await fetchDB("SET", user);
      } catch (error: any) {
        console.error("token上传失败");
        return {
          error: true,
          msg: "token上传失败" ? "empty access code" : "wrong access code",
        };
      }

      let systemApiKey: string | undefined;

      switch (modelProvider) {
        case ModelProvider.GeminiPro:
          systemApiKey = serverConfig.googleApiKey;
          break;
        case ModelProvider.Claude:
          systemApiKey = serverConfig.anthropicApiKey;
          break;
        case ModelProvider.GPT:
        default:
          if (serverConfig.isAzure) {
            systemApiKey = serverConfig.azureApiKey;
          } else {
            systemApiKey = serverConfig.apiKey;
          }

      const apiKey = serverConfig.apiKey;
      if (apiKey) {
        console.log("[Auth] use system api key");
        req.headers.set("Authorization", `Bearer ${apiKey}`);
      } else {
        console.log("[Auth] admin did not provide an api key");
      }

      return {
        error: false, //完成用户名登录
      };
    } 
  } else if (
    serverConfig.needCode &&
    !serverConfig.codes.has(hashedCode) &&
    !token
  ) {
    return {
      error: true,
      msg: !accessCode ? "empty access code" : "wrong access code",
    };
  }

  if (!accUserInfo) {
    return {
      error: true,
      msg: !accessCode ? "empty access code" : "wrong access code",
    };
  }

  if (!token) {
    const apiKey = serverConfig.apiKey;
    if (apiKey) {
      console.log("[Auth] use system api key");
      req.headers.set("Authorization", `Bearer ${apiKey}`);
    } else {
      console.log("[Auth] admin did not provide an api key");
    }
  } else {
    console.log("[Auth] use user api key");
  }

  return {
    error: false,
  };
}
}