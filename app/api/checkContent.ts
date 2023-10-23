import { NextApiRequest, NextApiResponse } from "next";

//import { checkSensitiveWords } from "../../app/api/ali/chatSensitive";
//import { getServerSideConfig } from "../config/server";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ message: "Hello World" });
}
/*
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const SERVER_CONFIG = getServerSideConfig();
  if (!SERVER_CONFIG.aliContentID || !SERVER_CONFIG.aliContentKEY) {
    throw new Error("内容检测API信息获取失败。");
  } else {
    if (req.method === "POST") {
      try {
        const content = req.body;
        const result = await checkSensitiveWords(
          content,
          SERVER_CONFIG.aliContentID,
          SERVER_CONFIG.aliContentKEY,
        );
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: "Server Error" });
      }
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  }
}
*/
