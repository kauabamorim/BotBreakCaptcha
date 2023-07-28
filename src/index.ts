import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const API_KEY = "1d293c30da707756b8d0ca1df2a4b8ef";

const jar = new CookieJar();
const client = axios.create({
  jar,
});

const breakCaptcha = async () => {
  let captchaId = "";

  try {
    const response = await axios.post("http://2captcha.com/in.php", {
      key: API_KEY,
      googlekey: "6LdXo-ISAAAAAFkY4XibHMoIIFk-zIaJ5Gv9mcnQ",
      method: "userrecaptcha",
      pageurl:
        "https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/ConsultaPlaca/ConsultarPlaca",
    });

    captchaId = response.data.replace("OK|", "");
    console.log("Resposta da API:", response.data);
  } catch (error) {
    console.error("Erro ao enviar captcha:", error);
  }

  const maxRetries = 5;
  const timeoutMillis = 25000;

  for (let retry = 1; retry <= maxRetries; retry++) {
    try {
      const captcha = await axios.get(
        `http://2captcha.com/res.php?key=${API_KEY}&action=get&id=${captchaId}`,
        {
          timeout: timeoutMillis,
        }
      );

      const captchaResponse = captcha.data;
      if (captchaResponse.includes("OK|")) {
        console.log(
          "Resultado do captcha:",
          captchaResponse.replace("OK|", "")
        );
        return;
      } else {
        console.log("Tentativa", retry);
      }
    } catch (error) {
      console.error("Erro na tentativa", retry, ":", error);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.error(
    "Todas as tentativas falharam. Não foi possível obter o resultado do captcha."
  );
};

breakCaptcha();
