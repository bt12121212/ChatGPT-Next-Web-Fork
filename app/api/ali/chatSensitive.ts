const RPCClient = require("@alicloud/pop-core");

export async function checkSensitiveWords(
  content: string,
  ALI_ACCESS_KEY_ID: string,
  ALI_ACCESS_SECRET: string,
) {
  var client = new RPCClient({
    accessKeyId: ALI_ACCESS_KEY_ID,
    accessKeySecret: ALI_ACCESS_SECRET,
    endpoint: "https://green-cip.cn-beijing.aliyuncs.com",
    apiVersion: "2022-03-02",
  });

  const params = {
    Service: "ai_art_detection",
    ServiceParameters: JSON.stringify({ content }),
  };

  console.log("Type of content:", typeof content);
  console.log("Value of content:", content);

  const serviceParameters = JSON.parse(params.ServiceParameters);

  if (
    !serviceParameters.hasOwnProperty("content") ||
    serviceParameters.content.trim().length === 0
  ) {
    console.log("text moderation content is empty");
    return content;
  }

  const requestOption = {
    method: "POST",
    formatParams: false,
  };

  try {
    var response = await client.request(
      "TextModeration",
      params,
      requestOption,
    );
    if (response.Code === 500) {
      client = new RPCClient({
        accessKeyId: ALI_ACCESS_KEY_ID,
        accessKeySecret: ALI_ACCESS_SECRET,
        endpoint: "https://green-cip.cn-beijing.aliyuncs.com",
        apiVersion: "2022-03-02",
      });
      response = await client.request("TextModeration", params, requestOption);
    }

    if (response.Code === 200 && response.Data.labels === "") {
      return content;
    } else {
      console.log(
        "发现违规内容：" +
          response.Data.labels +
          "。问题内容：" +
          response.Data.reason,
      );
      return content;
    }
  } catch (err) {
    console.log(
      "敏感词检测失败。" +
        "response.Code:" +
        response.Code +
        ", client:" +
        client,
    );
    return content;
  }
}
