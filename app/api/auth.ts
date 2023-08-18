import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX } from "../constant";

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
    const response = await fetch(
      "https://native-chow-30493.kv.vercel-storage.com/",
      {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer AXcdASQgN2NkNGQyMzYtYjE5Mi00NGZmLWIxODItNmMyNzg3MjgxOWQwNzE5Zjk3ZjMyOWNhNDkyMmE0MWUzYTY1MTUxNjI5MjY=",
        },
        body: JSON.stringify(body),
      },
    );

    return await response.json();
  } catch (error) {
    return { error: true, msg: (error as Error).message };
  }
}

// 新增的登录函数
export async function performLogin(username: string, password: string) {
  try {
    const response = await fetch(
      "https://native-chow-30493.kv.vercel-storage.com/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer AXcdASQgN2NkNGQyMzYtYjE5Mi00NGZmLWIxODItNmMyNzg3MjgxOWQwNzE5Zjk3ZjMyOWNhNDkyMmE0MWUzYTY1MTUxNjI5MjY=",
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      },
    );

    return await response.json();
  } catch (error) {
    return { error: true, msg: (error as Error).message };
  }
}

export async function login(req: NextRequest) {
  const requestBody = await req.json();
  const username = requestBody.username;
  const password = requestBody.password;

  // Check username and password in the database
  const user = await fetchDB("GET", { username: username });

  if (!user || md5.hash(password) !== user.passwordHash) {
    return { valid: false, error: "Invalid username or password" };
  }

  // Generate a new token
  const token = md5.hash(new Date().toISOString() + username);

  // Update tokens for the user
  if (user.tokens.length >= 10) {
    user.tokens.shift();
  }
  user.tokens.push(token);

  const IP = getIP(req);
  user.loginHistory.push({ time: new Date().toLocaleString(), IP: IP });

  // Update the user in the database
  await fetchDB("PUT", user);

  return { valid: true, token: token };
}

export async function auth(req: NextRequest) {
  const authToken = req.headers.get("Authorization") ?? "";
  const { accessCode, apiKey: token } = parseApiKey(authToken);

  const hashedCode = md5.hash(accessCode ?? "").trim();

  const serverConfig = getServerSideConfig();
  console.log("[Auth] allowed hashed codes: ", [...serverConfig.codes]);
  console.log("[Auth] got access code:", accessCode);
  console.log("[Auth] hashed access code:", hashedCode);
  console.log("[User IP] ", getIP(req));
  console.log("[Time] ", new Date().toLocaleString());

  if (serverConfig.needCode && !serverConfig.codes.has(hashedCode) && !token) {
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
    const apiKey = serverConfig.apiKey;
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
