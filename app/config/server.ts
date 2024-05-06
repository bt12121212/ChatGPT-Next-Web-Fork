import md5 from "spark-md5";
import { DEFAULT_MODELS } from "../constant";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PROXY_URL?: string; // docker only

      OPENAI_API_KEY?: string;
      CODE?: string;

      BASE_URL?: string;
      OPENAI_ORG_ID?: string; // openai only

      VERCEL?: string;
      BUILD_MODE?: "standalone" | "export";
      BUILD_APP?: string; // is building desktop app

      HIDE_USER_API_KEY?: string; // disable user's api key input
      DISABLE_GPT4?: string; // allow user to use gpt-4 or not
      ENABLE_BALANCE_QUERY?: string; // allow user to query balance or not
      DISABLE_FAST_LINK?: string; // disallow parse settings from url or not
      CUSTOM_MODELS?: string; // to control custom models
      DEFAULT_MODEL?: string; // to cnntrol default model in every new chat window

      // azure only
      AZURE_URL?: string; // https://{azure-url}/openai/deployments/{deploy-name}
      AZURE_API_KEY?: string;
      AZURE_API_VERSION?: string;

      // google only
      GOOGLE_API_KEY?: string;
      GOOGLE_URL?: string;

      // google tag manager
      GTM_ID?: string;

      USER_DB_URL?: string; //用户数据库url
      USER_DB_TOKEN?: string; //用户数据库token
      XFYUN_APPID?: string;
      XFYUN_APISECRET?: string;
      XFYUN_APIKEY?: string; //讯飞api
    }
  }
}

const ACCESS_CODES = (function getAccessCodes(): Set<string> {
  const code = process.env.CODE;

  try {
    const codes = (code?.split(",") ?? [])
      .filter((v) => !!v)
      .map((v) => md5.hash(v.trim()));
    return new Set(codes);
  } catch (e) {
    return new Set();
  }
})();

export const getServerSideConfig = () => {
  if (typeof process === "undefined") {
    throw Error(
      "[Server Config] you are importing a nodejs-only module outside of nodejs",
    );
  }

  const disableGPT4 = !!process.env.DISABLE_GPT4;
  let customModels = process.env.CUSTOM_MODELS ?? "";
  let defaultModel = process.env.DEFAULT_MODEL ?? "";

  if (disableGPT4) {
    if (customModels) customModels += ",";
    customModels += DEFAULT_MODELS.filter((m) => m.name.startsWith("gpt-4"))
      .map((m) => "-" + m.name)
      .join(",");
    if (defaultModel.startsWith("gpt-4")) defaultModel = "";
  }

  const isAzure = !!process.env.AZURE_URL;
  const isGoogle = !!process.env.GOOGLE_API_KEY;
  const isAnthropic = !!process.env.ANTHROPIC_API_KEY;

  const apiKeyEnvVar = process.env.OPENAI_API_KEY ?? "";
  const apiKeys = apiKeyEnvVar.split(",").map((v) => v.trim());
  const randomIndex = Math.floor(Math.random() * apiKeys.length);
  const apiKey = apiKeys[randomIndex];
  console.log(
    `[Server Config] using ${randomIndex + 1} of ${apiKeys.length} api key`,
  );

  const whiteWebDevEndpoints = (process.env.WHITE_WEBDEV_ENDPOINTS ?? "").split(
    ",",
  );

  return {
    baseUrl: process.env.BASE_URL,
    apiKey,
    openaiOrgId: process.env.OPENAI_ORG_ID,

    isAzure,
    azureUrl: process.env.AZURE_URL,
    azureApiKey: process.env.AZURE_API_KEY,
    azureApiVersion: process.env.AZURE_API_VERSION,

    isGoogle,
    googleApiKey: process.env.GOOGLE_API_KEY,
    googleUrl: process.env.GOOGLE_URL,

    isAnthropic,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicApiVersion: process.env.ANTHROPIC_API_VERSION,
    anthropicUrl: process.env.ANTHROPIC_URL,

    gtmId: process.env.GTM_ID,

    needCode: ACCESS_CODES.size > 0,
    code: process.env.CODE,
    codes: ACCESS_CODES,

    proxyUrl: process.env.PROXY_URL,
    isVercel: !!process.env.VERCEL,

    hideUserApiKey: !!process.env.HIDE_USER_API_KEY,
    disableGPT4,
    hideBalanceQuery: !process.env.ENABLE_BALANCE_QUERY,
    disableFastLink: !!process.env.DISABLE_FAST_LINK,
    customModels,
    defaultModel,
    whiteWebDevEndpoints,

    dbToken:
    process.env.USER_DB_TOKEN ||
    "AXcdASQgN2NkNGQyMzYtYjE5Mi00NGZmLWIxODItNmMyNzg3MjgxOWQwNzE5Zjk3ZjMyOWNhNDkyMmE0MWUzYTY1MTUxNjI5MjY=", // 如果环境变量不存在，使用默认值
  dbUrl:
    process.env.USER_DB_URL ||
    "https://native-chow-30493.kv.vercel-storage.com/", // 如果环境变量不存在，使用默认值
  xfyunAppid: process.env.XFYUN_APPID || "d7bfcdb7",
  xfyunApiSecret: process.env.XFYUN_APISECRET || "mM0NGVhNDljNDQ2MGUwYjk3NmM1Nzc5",
  xfyunApikey: process.env.XFYUN_APIKEY || "0884125412850b1ad69580f984266965"
  };
};
