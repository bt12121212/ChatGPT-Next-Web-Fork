const ALIYUN_API_URL = "https://green-cip.cn-beijing.aliyuncs.com";

export async function checkSensitiveWords(
  content: string,
  accountId: string,
): Promise<any> {
  const body = new URLSearchParams();
  body.append("Service", "ai_art_detection");
  body.append("ServiceParameters", JSON.stringify({ content, accountId }));

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
    throw new Error(`API responded with status ${response.status}`);
  }

  const responseData = await response.json();
  if (responseData.Code !== 200) {
    throw new Error(responseData.Message);
  }

  return responseData.Data;
}
