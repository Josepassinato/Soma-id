import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyChe9wkjloCxBBnsaYNCMLPQQXU6c-NkxA";
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  try {
    console.log("📋 Listando modelos disponíveis...\n");
    
    const models = await genAI.listModels();
    
    console.log(`Total de modelos: ${models.length}\n`);
    
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`);
      console.log(`   Display Name: ${model.displayName}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods.join(", ")}`);
      console.log();
    });
    
    // Filtrar modelos que suportam generateContent
    const imageModels = models.filter(m => 
      m.name.toLowerCase().includes("imagen") || 
      m.name.toLowerCase().includes("image")
    );
    
    if (imageModels.length > 0) {
      console.log("\n🎨 Modelos relacionados a imagem:");
      imageModels.forEach(m => {
        console.log(`  - ${m.name}`);
        console.log(`    Métodos: ${m.supportedGenerationMethods.join(", ")}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

listModels();
