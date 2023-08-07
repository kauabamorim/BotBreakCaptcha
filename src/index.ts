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
          return captchaResponse.replace("OK|", "");
        }
      } catch (error) {
        console.error("Erro ao tentar obter o resultado do captcha:", error);
      }
      await new Promise((resolve) => setTimeout(resolve, 12000));
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

const getTicket = async (
  debitId: string,
  plate: string,
  cpfEncrypted: string,
  retryCount = 6
) => {
  for (let i = 0; i < retryCount; i++) {
    try {
      const ticket = await client.get(
        `https://online5.detran.pe.gov.br/ServicosWeb/VeiculoMVC/DesdobramentoDebitos/ImprimirGuiaDesdobramento?Placa=${plate}&CpfCnpj=${cpfEncrypted}&DebitosSelecionados=${debitId}`,
        {
          headers: {
            referer: `https://online5.detran.pe.gov.br/ServicosWeb/VeiculoMVC/DesdobramentoDebitos/Desdobramento?Placa=${plate}&CpfCnpj=${cpfEncrypted}`,
          },
        }
      );

      const ticketResponse = ticket.data;
      const ticketData = parse(ticketResponse);

      const barcodeSelector =
        "#informacoes > tbody > tr:nth-child(1) > td > div.col-xs-7.borda-esquerda > label";
      const barcode = ticketData.querySelector(barcodeSelector);

      if (barcode) {
        return ticketData;
      } else {
        console.log(
          "Tentativa:",
          i + 1,
          "Barcode não encontrado, tentando novamente..."
        );
      }
    } catch (error) {
      console.error("Tentativa:", i + 1, "Erro:", error);
    }
  }

  throw new Error(
    `Não foi possível gerar o boleto com o barcode após ${retryCount} tentativas.`
  );
};

export const bot = async () => {
  let licensePlate = "PFJ7699";
  let document = "24633879472";
  let registryId = "00258896353";

  try {
    const captchaResponse = await breakCaptcha();

    await client.post(
      "https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/ConsultaPlaca/ConsultarPlaca",
      {
        Placa: licensePlate,
        captcha: captchaResponse,
      }
    );

    const debitsResponse = await client.get(
      `https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/ConsultaPlaca/DetalharDebito?placa=${licensePlate}&PlacaOutraUF=N`,
      {
        headers: {
          referer:
            "https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/ConsultaPlaca/ConsultarPlaca",
        },
      }
    );

    const root = parse(debitsResponse.data);
    const cpfEncryptedElement = root.querySelector("#hdfCpf");
    const cpfEncrypted = cpfEncryptedElement?.getAttribute("value") || "";

    const getTickets = await client.get(
      `https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/DesdobramentoDebitos/Desdobramento?Placa=${licensePlate}&CpfCnpj=${cpfEncrypted}`,
      {
        headers: {
          referer: `https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/DesdobramentoDebitos/Desdobramento?Placa=${licensePlate}&CpfCnpj=${cpfEncrypted}`,
        },
      }
    );

    const pageTicket = parse(getTickets.data);
    const paymentStatus = pageTicket.querySelectorAll('[strong^="Situação: "]');
    const elements = pageTicket.querySelectorAll('[id^="DebitoSelecionado_"]');
    const ids = Array.from(elements).map((element) =>
      element.id.replace("DebitoSelecionado_", "")
    );

    await client.get(
      `https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/DetalhamentoDebitos/ValidarImpressaoDesdobramento?CpfCnpj=${document}&Placa=${licensePlate}&CodRequerimento=0&`,
      {
        headers: {
          referer: `https://online6.detran.pe.gov.br/ServicosWeb/VeiculoMVC/DetalhamentoDebitos/Detalhamento?Placa=${licensePlate}&PlacaOutraUF=N`,
        },
      }
    );

    const ticketInformations = [];

    for (const id of ids) {
      const ticketData = await getTicket(id, licensePlate, cpfEncrypted);

      const renavam = ticketData.querySelector(
        "#informacoes > tbody > tr:nth-child(3) > td.col-xs-10 > div:nth-child(2) > label"
      );
      const barcode = ticketData.querySelector(
        "#informacoes > tbody > tr:nth-child(1) > td > div.col-xs-7.borda-esquerda > label"
      );
      const subtotal = ticketData.querySelector(
        "#informacoes > tbody > tr:nth-child(6) > td.col-xs-10 > div:nth-child(2) > label"
      );
      const total = ticketData.querySelector(
        "#informacoes > tbody > tr:nth-child(10) > td.col-xs-2 > label"
      );
      const description = ticketData.querySelector(
        "#informacoes > tbody > tr:nth-child(6) > td.col-xs-10 > div:nth-child(1) > label"
      );

      const dueDate = ticketData.querySelector(
        "#informacoes > tbody > tr:nth-child(2) > td.col-xs-2 > label"
      );

      let type = "";
      if (description && description.textContent.includes("INFRACAO")) {
        type = "Type 3";
      } else if (description && description.textContent.includes("IPVA")) {
        type = "Type 2";
      } else if (
        description &&
        description.textContent.includes("LICENCIAMENTO")
      ) {
        type = "Type 1";
      }
      
      const ticketInformation = {
        plate: licensePlate,
        renavam: renavam?.textContent.trim(),
        Type: type,
        Description: description?.textContent.trim(),
        Subtotal: Number(subtotal?.textContent.trim().replace(/,/, "")),
        total: Number(total?.textContent.trim().replace(/,/, "")),
        Barcode: barcode?.textContent.trim(),
        dueDate: dueDate?.textContent.trim(),
      };

      ticketInformations.push(ticketInformation);
    }

    console.log(ticketInformations);
  } catch (error) {
    console.log(error);
  }
};

bot();
