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
  
      const timeoutMillis = 25000;
  
      while (true) {
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
            console.log("Tentativa");
          }
        } catch (error) {
          console.error("Erro ao tentar obter o resultado do captcha:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, 13000));
      }
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
  let plate = "PFJ7699";

  try {
    const captchaResponse = await breakCaptcha();

    await client.post(
      "https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/ConsultaPlaca/ConsultarPlaca",
      {
        Placa: plate,
        captcha: captchaResponse,
      }
    );

    const response = await client.get(
      `https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/ConsultaPlaca/DetalharDebito?placa=${plate}&PlacaOutraUF=N`,
      {
        headers: {
            referer: "https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/ConsultaPlaca/ConsultarPlaca"
        }
      }
    );

    const root = parse(response.data);

    const plateInfo = root.querySelector("#placa");
    console.log("Placa:", plateInfo?.textContent.trim());
  } catch (error) {
    console.log(error);
  }
};

bot();
