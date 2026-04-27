import axios from "axios";

export interface BuildAppPayload {
  appName: string;
  websiteUrl: string;
}

export class WebToNativeClient {
  baseURL: string;
  defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = "https://www.webtonative.com/api/v1";
    this.defaultHeaders = {
      "accept-language": "ms-MY",
      origin: "https://www.webtonative.com",
      priority: "u=1, i",
      referer: "https://www.webtonative.com/",
      "sec-ch-ua": `"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
    };
  }

  async buildApp({ appName, websiteUrl }: BuildAppPayload) {
    try {
      const res = await axios.post(
        `${this.baseURL}/build-app-request`,
        {
          appName,
          emailId: "fongsifdev@gmail.com", // Changed to a more standard looking email, or keep original if needed, let's use a dummy one.
          packageId: "WEBTONATIVE_STARTER",
          websiteUrl,
          referralCode: "",
          utmInfo: {
            utm_source: "",
            utm_medium: "",
            utm_campaign: "",
            utm_term: "",
            utm_content: "",
          },
          device_type: "website",
          browser: "chrome",
        },
        { headers: this.defaultHeaders },
      );
      if (!res.data?.isSuccess) {
        throw new Error(res.data?.message || "Build app request failed");
      }
      return res.data;
    } catch (error: any) {
      console.error("Error in buildApp:", error?.response?.data || error.message);
      throw error;
    }
  }

  async checkStatus(requestId: string) {
    try {
      const res = await axios.get(`${this.baseURL}/check-app-status`, {
        params: { requestId },
        headers: this.defaultHeaders,
      });
      return res.data;
    } catch (error: any) {
      console.error("Error in checkStatus:", error?.response?.data || error.message);
      throw error;
    }
  }
}

export const scraperClient = new WebToNativeClient();
