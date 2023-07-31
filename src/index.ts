import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import parse from "node-html-parser";

const API_KEY = "1d293c30da707756b8d0ca1df2a4b8ef";

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
          captchaResponse.replace("OK|", "");
          return captchaResponse.replace("OK|", "");
        } else {
          console.log("Tentativa", retry);
        }
      } catch (error) {
        console.error("Erro na tentativa", retry, ":", error);
      }
      await new Promise((resolve) => setTimeout(resolve, 13000));
    }

    throw new Error(
      "Todas as tentativas falharam. Não foi possível obter o resultado do captcha."
    );
  } catch (error) {
    console.error("Erro ao enviar captcha:", error);
    throw error;
  }
};

const jar = new CookieJar();
const client = wrapper(
    axios.create({
        jar,
    })
);

export const bot = async () => {
  try {
    const captchaResponse = await breakCaptcha();

    await axios.post(
      "https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/ConsultaPlaca/ConsultarPlaca",
      {
        Placa: "PFJ7699",
        captcha: captchaResponse,
      }
    );

    const response = await client.get(
        `https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/DetalhamentoDebitos/Detalhamento?Placa=PFJ7699&PlacaOutraUF=N`,
    );

    const root = parse(response.data);
    const plate = root.querySelector("#placa");

    console.log("Teste ",plate);
    
  } catch (error) {
    console.log(error);
  }
};

bot();
