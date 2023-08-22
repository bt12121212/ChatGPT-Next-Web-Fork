import styles from "./auth.module.scss";
import { IconButton } from "./button";
import { performLogin, setToken, fetchDB } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { Path } from "../constant";
import { useAccessStore } from "../store";
import Locale from "../locales";

import React, { useState } from "react";

import BotIcon from "../icons/bot.svg";

export function AuthPage() {
  const navigate = useNavigate();
  const access = useAccessStore();
  const goHome = () => navigate(Path.Home);

  // 分别保存用户名和密码
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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
      console.log("data: ", userData); //********test
      if (userData.valid) {
        console.log("新用户登录: ", userData.user); //********test
        access.updateUser(JSON.stringify(userData.user));

        const token = setToken(username);
        const user = JSON.parse(access.accuserinfo);
        if (user.tokens && user.tokens.length >= 10) {
          user.tokens.shift();
        } else if (!user.tokens) {
          user.tokens = [];
        }
        user.tokens.push(token);
        const IP = await getClientIP(); //**我想要在这里获取IP**;
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
