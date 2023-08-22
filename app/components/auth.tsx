import styles from "./auth.module.scss";
import { IconButton } from "./button";
import { performLogin, setToken, fetchDB } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { Path } from "../constant";
import { useAccessStore } from "../store";
import Locale from "../locales";

import React, { useState, useEffect } from "react";

import BotIcon from "../icons/bot.svg";

export function AuthPage() {
  const navigate = useNavigate();
  const access = useAccessStore();
  const goHome = () => navigate(Path.Home);

  // 分别保存用户名和密码
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    (async () => {
      // 定义并立即执行一个异步函数
      if (access.accuserinfo) {
        const newuser = JSON.parse(access.accuserinfo);

        const token = setToken(username);
        if (newuser.tokens && newuser.tokens.length >= 10) {
          newuser.tokens.shift();
        } else if (!newuser.tokens) {
          newuser.tokens = [];
        }
        newuser.tokens.push(token);

        const IP = await getClientIP(); // 这里使用await
        if (!newuser.loginHistory) {
          newuser.loginHistory = []; // Ensure loginHistory property exists
        }
        newuser.loginHistory.push({
          time: new Date().toLocaleString(),
          IP: IP,
        });
        console.log("user2", newuser);
        try {
          await fetchDB("SET", JSON.stringify(newuser));
        } catch (error: any) {
          console.error("token上传失败");
        }
      }
    })(); // 立即执行这个异步函数
  }, [access.accuserinfo]);

  //获取IP
  async function getClientIP(): Promise<string> {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error("Error fetching client IP:", error);
      return ""; // 返回空字符串或其他默认值
    }
  }
  // 登录逻辑函数
  const handleLogin = async (username: string, password: string) => {
    try {
      const userData = await performLogin(username, password);
      if (userData.valid) {
        access.updateUser(JSON.stringify(userData.user));
        const newuser = JSON.parse(access.accuserinfo);
      } else {
        alert("用户名或密码错误");
      }
    } catch (error: any) {
      console.error("登录失败:", error.msg || error);
      alert("登录失败");
    }
  };

  return (
    <div className={styles["auth-page"]}>
      <div className={`no-dark ${styles["auth-logo"]}`}>
        <BotIcon />
      </div>

      <div className={styles["auth-title"]}>{Locale.Auth.Title}</div>
      <div className={styles["auth-tips"]}>{Locale.Auth.Tips}</div>

      <input
        className={styles["auth-inputusername"]}
        type="username"
        placeholder={Locale.Auth.Inputusername}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        className={styles["auth-inputpassword"]}
        type="password"
        placeholder={Locale.Auth.InputPassword}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className={styles["auth-actions"]}>
        <IconButton
          text={Locale.Auth.Confirm}
          type="primary"
          onClick={() => handleLogin(username, password)}
        />
        <IconButton text={Locale.Auth.Later} onClick={goHome} />
      </div>
    </div>
  );
}
