/* const ALIYUN_API_URL = "https://green-cip.cn-beijing.aliyuncs.com";

interface ApiResponse {
  RequestId: string;
  Message: string;
  Data: {
    reason: string;
    labels: string;
  };
  Code: number;
}

export async function checkSensitiveWords(content: string, accountId: string) {
  try {
    const result = await aliCheck(content, accountId);
    if (result.Code == 200) {
      if (result.Data.labels == "") {
        return content;
      } else {
        console.log(
          "发现违规内容：" +
            result.Data.labels +
            "。问题内容：" +
            result.Data.reason,
        );
        return content;
      }
    } else {
      console.log("[内容安全]通信失败");
      return content;
    }

    // 使用message变量
  } catch (error) {
    console.log("敏感词检测失败。");
    return content;
  }
}

async function aliCheck(
  content: string,
  accountId: string,
): Promise<ApiResponse> {
  const body = new URLSearchParams();
  body.append("Service", "ai_art_detection");
  body.append("ServiceParameters", JSON.stringify({ content, accountId }));
  body.append("SourceIp", "211.93.8.150");
  const response = await fetch(ALIYUN_API_URL, {
    method: "POST",
    headers: {
      "User-Agent": "Workbench/1.0",
      "Content-Type": "application/x-www-form-urlencoded",
      host: "green-cip.cn-beijing.aliyuncs.com", //修改为API KEY
    },
    body: body.toString(),
  });

  if (!response.ok) {
    console.log(`内容安全检查响应状态:${response.status}`);
  }

  const responseData = await response.json();

  switch (responseData.Code) {
    case 200:
      // 请求成功，不需要做任何处理
      break;
    case 400:
      console.log(
        "内容安全API失败：请求有误。原因：可能是请求参数不正确导致，请仔细检查请求参数。",
      );
      break;
    case 408:
      console.log(
        "内容安全API失败：原因：可能是您的账号未授权、账号欠费、账号未开通、账号被禁等。",
      );
      break;
    case 500:
      console.log(
        "内容安全API失败：错误。原因：可能是服务端临时出错。建议重试，若持续返回该错误码，请通过在线服务联系我们。",
      );
      break;
    case 581:
      console.log(
        "内容安全API失败：超时。建议重试，若持续返回该错误码，请通过在线服务联系我们。",
      );
      break;
    case 588:
      console.log("内容安全API失败：请求频率超出配额。");
      break;
    default:
      console.log("内容安全API失败：未知的错误。");
      break;
  }

  return responseData;
}
*/

const ALIYUN_API_URL = "https://green-cip.cn-beijing.aliyuncs.com";
const crypto = require("crypto");

interface ApiResponse {
  RequestId: string;
  Message: string;
  Data: {
    reason: string;
    labels: string;
  };
  Code: number;
}

export async function checkSensitiveWords(
  content: string,
  accountId: string,
  ALI_ACCESS_KEY_ID: string,
  ALI_ACCESS_SECRET: string,
) {
  try {
    const result = await aliCheck(
      content,
      accountId,
      ALI_ACCESS_KEY_ID,
      ALI_ACCESS_SECRET,
    );
    if (result.Code == 200) {
      if (result.Data.labels == "") {
        return content;
      } else {
        console.log(
          "发现违规内容：" +
            result.Data.labels +
            "。问题内容：" +
            result.Data.reason,
        );
        return content;
      }
    } else {
      console.log("[内容安全]通信失败");
      return content;
    }

    // 使用message变量
  } catch (error) {
    console.log("敏感词检测失败。");
    return content;
  }
}

function signature(
  headers: any,
  accessKeySecret: string,
  requestBody: string,
  path: string,
) {
  const signatureStr = [
    "POST",
    "application/json",
    headers["Content-MD5"],
    "application/json",
    headers["Date"],
    "x-acs-signature-method:HMAC-SHA1",
    `x-acs-signature-nonce:${headers["x-acs-signature-nonce"]}`,
    "x-acs-signature-version:1.0",
    `x-acs-version:${headers["x-acs-version"]}`,
    path,
  ].join("\n");

  return crypto
    .createHmac("sha1", accessKeySecret)
    .update(signatureStr)
    .digest("base64");
}

async function aliCheck(
  content: string,
  accountId: string,
  ALI_ACCESS_KEY_ID: string,
  ALI_ACCESS_SECRET: string,
): Promise<ApiResponse> {
  const requestBody = JSON.stringify({
    Service: "ai_art_detection",
    ServiceParameters: { content, accountId },
  });

  const headers: { [key: string]: string } = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Content-MD5": crypto
      .createHash("md5")
      .update(requestBody)
      .digest("base64"),
    Date: new Date().toUTCString(),
    "x-acs-version": "2017-01-12",
    "x-acs-signature-nonce": crypto.randomBytes(16).toString("hex"),
    "x-acs-signature-version": "1.0",
    "x-acs-signature-method": "HMAC-SHA1",
  };

  headers["Authorization"] =
    "acs " +
    ALI_ACCESS_KEY_ID +
    ":" +
    signature(headers, ALI_ACCESS_SECRET, requestBody, "/green/text/scan");

  const response = await fetch(ALIYUN_API_URL, {
    method: "POST",
    headers: headers,
    body: requestBody,
  });

  if (!response.ok) {
    console.log(`内容安全检查响应状态:${response.status}`);
  }

  const responseData = await response.json();

  switch (responseData.Code) {
    case 200:
      // 请求成功，不需要做任何处理
      break;
    case 400:
      console.log(
        "内容安全API失败：请求有误。原因：可能是请求参数不正确导致，请仔细检查请求参数。",
      );
      break;
    case 408:
      console.log(
        "内容安全API失败：原因：可能是您的账号未授权、账号欠费、账号未开通、账号被禁等。",
      );
      break;
    case 500:
      console.log(
        "内容安全API失败：错误。原因：可能是服务端临时出错。建议重试，若持续返回该错误码，请通过在线服务联系我们。",
      );
      break;
    case 581:
      console.log(
        "内容安全API失败：超时。建议重试，若持续返回该错误码，请通过在线服务联系我们。",
      );
      break;
    case 588:
      console.log("内容安全API失败：请求频率超出配额。");
      break;
    default:
      console.log("内容安全API失败：未知的错误。");
      break;
  }

  return responseData;
}
