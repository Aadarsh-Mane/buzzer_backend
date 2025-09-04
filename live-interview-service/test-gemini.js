import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGeminiConnection() {
  try {
    console.log('🔍 Testing Gemini API connection...');
    
    // Check if API key is set
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      console.error('❌ GEMINI_API_KEY is not set or is using default value');
      console.log('Please set GEMINI_API_KEY in your .env file');
      return;
    }
    
    console.log('✅ API Key found');
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test with gemini-1.5-flash model
    console.log('🧪 Testing gemini-1.5-flash model...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Simple test prompt
    const prompt = "Hello, this is a test message. Please respond with 'Test successful' if you can see this.";
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API test successful!');
    console.log('Response:', text);
    
  } catch (error) {
    console.error('❌ Gemini API test failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('💡 The API key appears to be invalid. Please check your GEMINI_API_KEY.');
    } else if (error.message.includes('not found')) {
      console.log('💡 The model might not be available. Try using a different model.');
    } else {
      console.log('💡 Check your internet connection and API key configuration.');
    }
  }
}

testGeminiConnection(); 