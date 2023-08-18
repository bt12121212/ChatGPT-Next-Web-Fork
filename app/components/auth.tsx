import styles from "./auth.module.scss";
import { IconButton } from "./button";
import { performLogin, setToken } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { Path } from "../constant";
import { useAccessStore } from "../store";
import { NextRequest } from "next/server";
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

  // 登录逻辑函数
  const handleLogin = async (username: string, password: string) => {
    try {
      const data = await performLogin(username, password);

      if (data.valid) {
        const tokenData = await setToken({
          json: () => ({ username, password }),
        } as any);

        if (tokenData.valid && tokenData.token) {
          localStorage.setItem("token", tokenData.token); // 保存token到localStorage
          alert("登录成功");
          goHome(); // 比如跳转到主页
        } else {
          alert("无法生成token，请稍后再试");
        }
      } else {
        alert("登录失效、请重新登录");
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
        onChange={(e) => setUsername(e.currentTarget.value)}
      />

      <input
        className={styles["auth-inputpassword"]}
        type="password"
        placeholder={Locale.Auth.InputPassword}
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
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
