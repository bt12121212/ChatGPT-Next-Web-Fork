import { NextApiRequest, NextApiResponse } from "next";
import { checkSensitiveWords } from "../../app/api/ali/chatSensitive";
import { getServerSideConfig } from "../../app/config/server";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const SERVER_CONFIG = getServerSideConfig();
  if (!SERVER_CONFIG.aliContentID || !SERVER_CONFIG.aliContentKEY) {
    throw new Error("内容检测API信息获取失败。");
  } else {
    console.log("内容检测API读取成功！ ID：" + SERVER_CONFIG.aliContentID);
    if (req.method === "POST") {
      try {
        const content = req.body.content;
        const result = await checkSensitiveWords(
          content,
          SERVER_CONFIG.aliContentID,
          SERVER_CONFIG.aliContentKEY
        );
        
        res.status(200).json(result);
      } catch (error:any) {
        console.error("Error handling checkContent:", error);
        res.status(500).json({ error: `Server Error: ${error.message}` });
      }
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  }
}

/*
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ message: "Hello World" });
}
*/
