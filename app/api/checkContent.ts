import { checkSensitiveWords } from "../../app/api/ali/chatSensitive";
import { NextApiRequest, NextApiResponse } from "next";

const ALI_ACCESS_KEY_ID = "LTAI5tQsjuT3bLwabGrriAYD";
const ALI_ACCESS_SECRET = "9oDhHnxlDpY6sZWc2o47K2EtQQj8p7";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    try {
      const content = req.body;
      const result = await checkSensitiveWords(
        content,
        ALI_ACCESS_KEY_ID,
        ALI_ACCESS_SECRET,
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: "Server Error" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
