import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

// API Key do Google
const API_KEY = "AIzaSyChe9wkjloCxBBnsaYNCMLPQQXU6c-NkxA";

// Inicializar o cliente
const genAI = new GoogleGenerativeAI(API_KEY);

// Configurar o modelo Gemini Image (Nano Banana)
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-image"
});

// Prompt para a imagem conceitual da cozinha
const prompt = `
Ultra-realistic conceptual render of a compact minimalist modern kitchen in an apartment.
**Importante:** Não altere a estrutura arquitetônica existente. Não invente, remova ou modifique janelas ou portas. Foco total na marcenaria e na iluminação excelente.
Clean lines, soft ambient lighting.
Cabinetry in light gray MDF.
White quartz countertop.
Light wood accents.
Seamless, handleless design.
Integrated LED lighting.
Cozy and highly functional atmosphere.
Architectural photography, 24mm lens, high quality.
No measurements, no text overlays, no watermarks.
`;

async function generateImage() {
  try {
    console.log("🎨 Gerando imagem conceitual com Imagen...");
    
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: prompt.trim() }]
      }]
    });

    // Extrair a imagem em Base64
    const candidate = result.response.candidates?.[0];
    if (!candidate) {
      throw new Error("Nenhum candidato retornado pela API");
    }

    // A resposta vem em 2 partes: [0] = texto, [1] = imagem
    // Procurar pela parte que contém a imagem
    let imageBase64: string | undefined;
    
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }

    if (!imageBase64) {
      console.error("\n❌ Nenhum inlineData.data encontrado!");
      console.error("Parts disponíveis:", candidate.content.parts);
      throw new Error("Nenhum dado de imagem retornado");
    }

    // Criar pasta exports se não existir
    const exportsDir = "./exports";
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Salvar a imagem
    const outputPath = path.join(exportsDir, "cozinha_conceitual_imagen.png");
    fs.writeFileSync(outputPath, Buffer.from(imageBase64, "base64"));

    console.log(`✅ Imagem salva em: ${outputPath}`);
    console.log(`📏 Tamanho: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
    
    return outputPath;
  } catch (error) {
    console.error("❌ Erro ao gerar imagem:", error);
    throw error;
  }
}

// Executar
generateImage()
  .then(path => {
    console.log(`\n🎉 SUCESSO! Imagem de encantamento gerada:\n${path}`);
  })
  .catch(error => {
    console.error("\n❌ FALHA:", error.message);
    process.exit(1);
  });
