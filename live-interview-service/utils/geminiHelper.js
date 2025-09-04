import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiHelper {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your-gemini-api-key');
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async provideTechnicalHelp(question, context = '') {
    try {
      const prompt = `
You are a helpful technical interview assistant. A candidate has asked a technical question during an interview.

Question: "${question}"

Context: ${context}

Please provide a comprehensive, helpful answer that:
1. Explains the concept clearly and concisely
2. Provides practical examples when relevant
3. Shows best practices and common pitfalls
4. Is suitable for an interview context
5. Keeps the response focused and not too long

Format your response in a clear, structured way.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        stack: error.stack
      });
      return 'Sorry, I could not process your request at the moment. Please try again.';
    }
  }

  async analyzeInterviewQuestion(question, jobRole = 'software developer') {
    try {
      const prompt = `
You are an AI assistant helping a candidate in a technical interview for a ${jobRole} position.

The candidate has been asked: "${question}"

Please provide:
1. A clear explanation of what the interviewer is looking for
2. A structured approach to answering this question
3. Key points to mention in the response
4. Common mistakes to avoid
5. A sample answer framework

Keep your response helpful but concise, as this is for real-time interview assistance.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      return 'Sorry, I could not analyze this question at the moment.';
    }
  }

  async getCodingHelp(codeSnippet, language = 'javascript') {
    try {
      const prompt = `
You are a helpful coding assistant. A candidate is working on this ${language} code:

${codeSnippet}

Please provide:
1. A brief explanation of what the code does
2. Any potential issues or improvements
3. Best practices for this type of code
4. Alternative approaches if relevant

Keep your response focused and practical for an interview context.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      return 'Sorry, I could not analyze this code at the moment.';
    }
  }

  async provideBehavioralGuidance(question) {
    try {
      const prompt = `
You are an AI assistant helping with behavioral interview questions.

The candidate has been asked: "${question}"

Please provide:
1. What the interviewer is looking for in this question
2. The STAR method framework for answering
3. Key points to include in the response
4. Tips for structuring the answer
5. Common mistakes to avoid

Keep your guidance practical and interview-focused.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      return 'Sorry, I could not provide guidance for this question at the moment.';
    }
  }
}

export default new GeminiHelper(); 