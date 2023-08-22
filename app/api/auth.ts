import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX } from "../constant";
import { useAccessStore } from "../store";

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

  return {
    accessCode: isOpenAiKey ? "" : token.slice(ACCESS_CODE_PREFIX.length),
    apiKey: isOpenAiKey ? token : "",
  };
}

async function fetchDB(
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
        // 更新用户数据
        const hashedPassword = md5.hash(userInfo.password);
        const userData = {
          ...userInfo,
          password: hashedPassword,
        };
        sendDBmsg = [
          "HSET",
          "zwxzUserData",
          userInfo.username,
          JSON.stringify(userData),
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
  const user = await fetchDB("GET", { username: username });

  // 判断user是否存在，并且传入的密码是否与存储在数据库中的密码匹配
  if (user && md5.hash(password) === user.password) {
    return { valid: true, user: user }; // 在这里，我们返回了user对象
  } else {
    alert(JSON.stringify(user));
    return { valid: false, error: "Invalid username or password" };
  }
}

export async function setToken(username: string) {
  const token = md5.hash(new Date().toISOString() + username);
  return { valid: true, token: token };
}

export async function auth(req: NextRequest) {
  const authToken = req.headers.get("Authorization") ?? "";
  const { accessCode, apiKey: token } = parseApiKey(authToken);

  const hashedCode = md5.hash(accessCode ?? "").trim();
  const serverConfig = getServerSideConfig();

  console.log("[Auth] allowed hashed codes: ", [...SERVER_CONFIG.codes]);
  console.log("[Auth] got access code:", accessCode);
  console.log("[Auth] hashed access code:", hashedCode);
  console.log("[User IP] ", getIP(req));
  console.log("[Time] ", new Date().toLocaleString());

  const access = useAccessStore.getState(); //new user
  if (access.accuserinfo) {
    console.log("[Userinfo] ", access.accuserinfo);
    const user = JSON.parse(access.accuserinfo);

    if (user.tokens && user.tokens.length >= 10) {
      user.tokens.shift();
    } else if (!user.tokens) {
      user.tokens = [];
    }
    user.tokens.push(token);
    const IP = getIP(req);
    if (!user.loginHistory) {
      user.loginHistory = []; // Ensure loginHistory property exists
    }
    user.loginHistory.push({ time: new Date().toLocaleString(), IP: IP });

    await fetchDB("SET", {
      uid: user.uid,
      username: user.username,
      password: user.password,
      tokens: user.tokens,
      loginHistory: user.loginHistory,
    });
  }

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
    } else if (access) {
      console.log("【Auth】use user/password login");
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
