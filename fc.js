const { connect } = require("puppeteer-real-browser");
const fs = require("fs");
const Tesseract = require("tesseract.js");
require("dotenv").config({ quiet: true });

const ocr = async (imagem) => {
  try {
    const result = await Tesseract.recognize(imagem, "eng");
    return (result.data.text || "").trim();
  } catch (error) {
    console.error(error);
    return "";
  }
};

const capResposta = {
  food: [
    "pizza",
    "berries",
    "tomatos",
    "fruit",
    "bread",
    "carrot",
    "banana",
    "grape",
    "orange",
    "mango",
    "papaya",
    "peach",
    "salad",
    "soup",
    "sushi",
    "taco",
    "yogurt",
    "noodles",
    "butter",
    "cheese",
    "chocolate",
    "donut",
    "honey",
    "jam",
    "kebab",
    "lasagna",
    "omelet",
    "pancake",
    "quiche",
    "risotto",
    "sausage",
    "waffle",
    "zucchini",
    "fruits",
  ],
  colour: [
    "yellow",
    "black",
    "red",
    "silver",
    "circle",
    "blue",
    "green",
    "purple",
    "orange",
    "gold",
    "white",
    "brown",
    "grey",
  ],
  country: [
    "australia",
    "brazil",
    "canada",
    "denmark",
    "egypt",
    "finland",
    "germany",
    "hungary",
    "india",
    "japan",
    "kenya",
    "latvia",
    "malta",
    "nepal",
    "oman",
    "qatar",
    "spain",
    "turkey",
    "uganda",
    "yemen",
    "china",
    "france",
    "italy",
    "mexico",
    "norway",
    "poland",
    "russia",
    "sweden",
    "vietnam",
    "cyprus",
    "bhutan",
    "greece",
    "haiti",
    "libya",
    "monaco",
    "peru",
    "sudan",
    "tonga",
    "china",
    "zambia",
  ],
  animal: [
    "fish",
    "fishes",
    "cat",
    "dog",
    "bear",
    "wolf",
    "whale",
    "tiger",
    "eagle",
    "monkey",
    "dolphin",
    "penguin",
    "zebra",
    "lion",
    "rabbit",
    "panda",
    "koala",
    "camel",
    "otter",
    "buffalo",
    "donkey",
    "falcon",
    "jaguar",
    "lemur",
    "meerkat",
    "newt",
    "ocelot",
    "parrot",
    "quokka",
    "raccoon",
    "salamander",
    "tapir",
    "uakari",
    "vulture",
    "walrus",
    "xerus",
    "yak",
    "giraffe",
  ],
};

async function resolverCaptcha(page) {
  // Captura o label completo
  const labelText = await page.evaluate(() => {
    const label = document.querySelector(
      "form > div.step2 > div:nth-child(3) > label"
    );
    return label ? label.innerText.trim() : "";
  });

  if (!labelText) {
    // console.log("⚠️ Label do captcha não encontrado");
    return "";
  }

  // console.log("\n📌 LABEL DETECTADO:", labelText);

  let lista = [];
  try {
    const spans = await page.$$eval(".cap4tcha-fo4cus", (elements) =>
      elements.map((el) => el.innerText.trim())
    );

    // console.log("📌 Spans encontrados:", spans);

    // O último span geralmente contém a lista de palavras
    const listaSpan = spans[spans.length - 1];

    // Separa por vírgula ou ponto
    lista = listaSpan
      .split(/[,.\s]+/)
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v && v.length > 2);

    // console.log("📌 Lista detectada:", lista);
  } catch {
    // console.log("ℹ️ Nenhuma lista .cap4tcha-fo4cus encontrada");
  }

  const labelLower = labelText.toLowerCase();

  // ======================================================
  // 1) CAPTCHA DE IMAGEM
  // ======================================================
  const imgURL = await page.evaluate(() => {
    const label = document.querySelector(
      "form > div.step2 > div:nth-child(3) > label"
    );
    if (!label) return null;
    const img = label.querySelector("img");
    return img ? img.src : null;
  });

  if (imgURL) {
    // console.log("➡️ Captcha de IMAGEM detectado:", imgURL);

    const response = await fetch(imgURL);
    const buf = await response.arrayBuffer();
    fs.writeFileSync("captcha.png", Buffer.from(buf));

    let ocrText = (await ocr("captcha.png")).toLowerCase().trim();
    // console.log("📌 OCR RAW:", ocrText);

    // Caso OCR retorne "colour" ou "animal" ou outro termo → resolve pela lista
    if (
      ["colour", "color", "animal", "country", "food"].includes(ocrText) &&
      lista.length > 0
    ) {
      // console.log("➡️ OCR retornou categoria. Agora selecionando da lista...");

      const categoria = ocrText === "color" ? "colour" : ocrText;

      const candidatos = capResposta[categoria] || [];
      const match = lista.find((x) => candidatos.includes(x));

      // console.log("✔ MATCH encontrado:", match || "(nenhum)");

      return match || "";
    }

    const somar = ocrText.includes("+");
    const subtrair = ocrText.includes("-");

    if (somar || subtrair) {
      const operador = somar ? "+" : "-";
      const partes = ocrText.split(operador).map((x) => x.trim());
      if (partes.length === 2) {
        const a = parseInt(partes[0].replace(/\D/g, ""), 10);
        const b = parseInt(partes[1].replace(/\D/g, ""), 10);
        if (!isNaN(a) && !isNaN(b)) {
          const resultado = somar ? a + b : a - b;
          // console.log(`✔ Operação OCR: ${a} ${operador} ${b} = ${resultado}`);
          return String(resultado);
        }
      }
    }

    const apenasNumeros = ocrText.replace(/\D+/g, "");
    if (apenasNumeros) {
      // console.log("✔ OCR retornou número:", apenasNumeros);
      return apenasNumeros;
    }

    // console.log("⚠️ Não foi possível extrair resposta numérica do OCR.");
    return "";

    // const normalized = ocrText.replace(/[^\d+\-\s]/g, " ").trim();
    // const nums = normalized.match(/[+-]?\d+/g) || [];

    // if (/[+\-]/.test(normalized) && nums.length >= 2) {
    //   const a = Number(nums[0]);
    //   const b = Number(nums[1]);
    //   const operador = normalized.includes("+") ? "+" : "-";
    //   const resultado = operador === "+" ? a + b : a - b;

    //   console.log(`✔ Operação OCR: ${a} ${operador} ${b} = ${resultado}`);
    //   return String(resultado);
    // }

    // if (nums.length === 1) {
    //   console.log("✔ OCR retornou número:", nums[0]);
    //   return String(nums[0]);
    // }

    // // fallback
    // const fallback = ocrText.replace(/\D+/g, "");
    // return fallback || "";
  }

  // ======================================================
  // 2) CAPTCHA DE PALAVRAS (SEM IMAGEM)
  // ======================================================

  // ======================================================
  // 2.0) Detectar operação matemática no texto (sem imagem)
  // ======================================================
  const mathMatch = labelLower.match(/(\d+)\s*([+\-])\s*(\d+)/);
  if (mathMatch) {
    const a = parseInt(mathMatch[1], 10);
    const operador = mathMatch[2];
    const b = parseInt(mathMatch[3], 10);

    const resultado = operador === "+" ? a + b : a - b;

    console.log(
      `📌 Operação matemática detectada: ${a} ${operador} ${b} = ${resultado}`
    );

    return String(resultado);
  }

  const matchFirstLetters = labelLower.match(/first\s+(\d+)\s+letters?/);
  if (matchFirstLetters && lista.length > 0) {
    const numLetras = parseInt(matchFirstLetters[1], 10);
    const palavra = lista[lista.length - 1]; // última palavra da lista

    const resposta = palavra.substring(0, numLetras);

    // console.log(
    //   `📌 Captcha: primeiros ${numLetras} caracteres de "${palavra}"`
    // );
    // console.log(`✔ Resposta: ${resposta}`);

    return resposta;
  }

  let categoriaDetectada = null;
  for (const cat of Object.keys(capResposta)) {
    if (labelLower.includes(cat)) {
      categoriaDetectada = cat;
      break;
    }
  }

  // console.log("📌 Categoria detectada:", categoriaDetectada);

  if (categoriaDetectada && lista.length > 0) {
    const candidatos = capResposta[categoriaDetectada];

    // console.log("📌 Candidatos da categoria:", candidatos);
    // console.log("📌 Lista recebida:", lista);

    const match = lista.find((x) => candidatos.includes(x));

    // console.log("✔ Palavra escolhida:", match || "(nenhum match)");

    return match || "";
  }

  // console.log("⚠️ Nenhuma correspondência encontrada.");
  return "";
}

const fc = async () => {
  const { page, browser } = await connect({
    args: ["--start-maximized"],
    headless: false,
    turnstile: true,
    connectOption: { defaultViewport: null },
    plugins: [],
  });

  try {
    browser.on("targetcreated", async (target) => {
      const newPage = await target.page();
      if (newPage) await newPage.close();
    });

    const login = process.env.LOGIN;
    const url = process.env.URL;

    await page.goto(`${url}/?r=${login}`, {
      waitUntil: "networkidle2",
    });

    await new Promise((r) => setTimeout(r, 2000));

    let token = null;
    let startDate = Date.now();
    while (!token && Date.now() - startDate < 30000) {
      token = await page.evaluate(() => {
        try {
          // document.querySelector("#cf_turnstile").click();
          let item = document.querySelector(
            '[name="cf-turnstile-response"]'
          ).value;
          return item && item.length > 20 ? item : null;
        } catch (e) {
          return null;
        }
      });
      await new Promise((r) => setTimeout(r, 1000));
    }

    await new Promise((r) => setTimeout(r, 5000));

    console.log(token);

    // if document.querySelector(".alert-success > strong > u").innerText;

    await page.evaluate((loginValue) => {
      const input = document.querySelector(
        'input[type="text"][placeholder="Please enter your FaucetPay.io address"]'
      );
      if (input) input.value = loginValue;
    }, login);

    const resposta = await resolverCaptcha(page);
    if (!resposta) {
      console.log("cloudflare");
    } else {
      await page.type(
        "form > div.step2 > div:nth-child(3) > div.col-sm-5.col-md-7 > input:nth-child(1)",
        String(resposta),
        { delay: 30 }
      );
    }
    await new Promise((r) => setTimeout(r, 5000));
    await page.screenshot({ path: "screen.png" });
  } catch (error) {
    await page.screenshot({ path: "screen.png" });
    console.error(`Erro interno do servidor: ${error.message}`);
    await browser.close();
    await new Promise((r) => setTimeout(r, 5000));
    await fc();
  } finally {
    await browser.close();
  }
};

fc();
