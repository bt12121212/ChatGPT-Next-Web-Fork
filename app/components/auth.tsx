import styles from "./auth.module.scss";
import { IconButton } from "./button";
import { performLogin, setToken, fetchDB } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { Path } from "../constant";
import { useAccessStore } from "../store";
import Locale from "../locales";
import md5 from "spark-md5";

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
      const userData = await performLogin(username, md5.hash(password)); //返回用户名&密码&token的JSON.stringify
      if (userData.valid && userData.user) {
        access.updateUserinfo(userData.user);
        localStorage.setItem("userData", userData.user);
        alert("欢迎登录尊闻行知");
        goHome();
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
