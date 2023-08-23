import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX, ACCESS_USER_PREFIX } from "../constant";

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

export async function fetchDB(
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
        用户数据示例：
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
    const token = await setToken(username);
    const storageUser = {
      username: username,
      password: password,
      token: token,
    };
    return { valid: true, user: JSON.stringify(storageUser) }; // 在这里，我们返回了user 用户名和token的JSON.stringify
  } else {
    return { valid: false, error: "Invalid username or password" };
  }
}

export async function setToken(username: string) {
  const token = md5.hash(new Date().toISOString() + username);
  return { token: token };
}

export async function auth(req: NextRequest) {
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
  /*       8.24在增加用户名的授权
  if (accUserInfo){
 
    performLogin(username: string, password: string)
    if (newuser.tokens && newuser.tokens.length >= 10) {
      newuser.tokens.shift();
    } else if (!newuser.tokens) {
      newuser.tokens = [];
    }
    newuser.tokens.push(token);

    const IP = getIP(req);
    if (!newuser.loginHistory) {
      newuser.loginHistory = []; // Ensure loginHistory property exists
    }
    newuser.loginHistory.push({
      time: new Date().toLocaleString(),
      IP: IP,
    });

    try {
      await fetchDB("SET", JSON.stringify(newuser));
    } catch (error: any) {
      console.error("token上传失败");
    }
  }
*/

  if (serverConfig.needCode && !serverConfig.codes.has(hashedCode) && !token) {
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
