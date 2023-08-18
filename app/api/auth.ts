import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX } from "../constant";

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
  body: any,
): Promise<{ [key: string]: any }> {
  try {
    let formattedBody;
    // 如果是"PUT"方法，将对象转换为字符串
    if (method === "PUT") {
      formattedBody = JSON.stringify(body);
    } else {
      formattedBody = body;
    }

    const response = await fetch(DB_URL, {
      // 【修改】
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DB_TOKEN}`, // 【修改】
      },
      body: formattedBody,
    });

    if (method === "GET") {
      const data = await response.text();
      return JSON.parse(data);
    } else {
      return await response.json();
    }
  } catch (error) {
    return { error: true, msg: (error as Error).message };
  }
}

// 新增的登录函数
export async function performLogin(username: string, password: string) {
  try {
    const response = await fetch(DB_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DB_TOKEN}`,
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    });

    const responseData = await response.json();

    if (responseData && responseData.valid) {
      return { valid: true };
    } else {
      return { valid: false, error: "Invalid username or password" };
    }
  } catch (error) {
    return { error: true, msg: (error as Error).message };
  }
}

export async function setToken(req: NextRequest) {
  const { username, password } = await req.json();

  // Check username and password in the database
  const user = await fetchDB("GET", { username: username });

  if (!user || md5.hash(password) !== user.password) {
    return { valid: false, error: "Invalid username or password" };
  }

  // Generate a new token
  const token = md5.hash(new Date().toISOString() + username);

  // Update tokens for the user
  if (user.tokens && user.tokens.length >= 10) {
    user.tokens.shift();
  } else if (!user.tokens) {
    user.tokens = []; // Ensure tokens property exists
  }
  user.tokens.push(token);

  const IP = getIP(req);
  if (!user.loginHistory) {
    user.loginHistory = []; // Ensure loginHistory property exists
  }
  user.loginHistory.push({ time: new Date().toLocaleString(), IP: IP });

  // Update the user in the database
  await fetchDB("PUT", user);

  return { valid: true, token: token };
}

export async function auth(req: NextRequest) {
  const authToken = req.headers.get("Authorization") ?? "";
  const { accessCode, apiKey: token } = parseApiKey(authToken);

  const hashedCode = md5.hash(accessCode ?? "").trim();

  console.log("[Auth] allowed hashed codes: ", [...SERVER_CONFIG.codes]);
  console.log("[Auth] got access code:", accessCode);
  console.log("[Auth] hashed access code:", hashedCode);
  console.log("[User IP] ", getIP(req));
  console.log("[Time] ", new Date().toLocaleString());

  if (
    SERVER_CONFIG.needCode &&
    !SERVER_CONFIG.codes.has(hashedCode) &&
    !token
  ) {
    return {
      error: true,
      msg: !accessCode ? "empty access code" : "wrong access code",
    };
  }

  if (token) {
    // Check if the token exists in the database for the given user
    const user = await fetchDB("GET", { token: token });
    if (user && user.tokens.includes(token)) {
      return {
        error: false,
      };
    }
  } else {
    // if user does not provide an api key, inject system api key
    const apiKey = SERVER_CONFIG.apiKey;
    if (apiKey) {
      console.log("[Auth] use system api key");
      req.headers.set("Authorization", `Bearer ${apiKey}`);
    } else {
      console.log("[Auth] admin did not provide an api key");
    }
  }

  return {
    error: false,
  };
}
