import styles from "./auth.module.scss";
import { IconButton } from "./button";
import { performLogin } from "../api/auth";
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

  // 登录逻辑函数
  const handleLogin = async () => {
    try {
      const data = await performLogin(username, password);

      // 根据你的后端的响应结构进行调整
      if (data.valid) {
        localStorage.setItem("token", data.token); // 保存token
        goHome();
      } else {
        // 显示错误消息
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
          onClick={handleLogin}
        />
        <IconButton text={Locale.Auth.Later} onClick={goHome} />
      </div>
    </div>
  );
}
