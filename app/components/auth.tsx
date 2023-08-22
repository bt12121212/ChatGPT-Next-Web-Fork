import styles from "./auth.module.scss";
import { IconButton } from "./button";
import { performLogin, setToken } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { Path } from "../constant";
import { useAccessStore } from "../store";
import Locale from "../locales";

import BotIcon from "../icons/bot.svg";

export function AuthPage() {
  const navigate = useNavigate();
  const access = useAccessStore();
  const goHome = () => navigate(Path.Home);

  // 分别保存用户名和密码

  const username = "";
  const password = "";
  // 登录逻辑函数
  const handleLogin = async (username: string, password: string) => {
    try {
      const userData = await performLogin(username, password);
      console.log("data: ", userData); //********test
      if (userData.valid) {
        console.log("新用户登录: ", userData.user); //********test
        access.updateUser(JSON.stringify(userData.user));
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
      />

      <input
        className={styles["auth-inputpassword"]}
        type="password"
        placeholder={Locale.Auth.InputPassword}
        value={password}
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
