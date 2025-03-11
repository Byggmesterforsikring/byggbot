const Anthropic = require('@anthropic-ai/sdk');
const electronLog = require('electron-log');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { app } = require('electron');
const config = require('../config');

// Max file size: 30MB in bytes
const MAX_FILE_SIZE = 30 * 1024 * 1024;

// Configure Anthropic API
let anthropic = null;

// Initialize Anthropic client with the company-wide API key
function initAnthropicClient(apiKey = null) {
  try {
    // Prioritér API nøkkel fra config
    const key = apiKey || config.ANTHROPIC_API_KEY;

    if (!key) {
      throw new Error('Missing API key for Anthropic');
    }

    anthropic = new Anthropic({
      apiKey: key,
    });
    return true;
  } catch (error) {
    electronLog.error('Failed to initialize Anthropic client:', error);
    return false;
  }
}

// Initialize the client when the service is loaded
initAnthropicClient();

// Create uploads directory if it doesn't exist
const createUploadsDirIfNeeded = () => {
  const uploadsDir = path.join(app.getPath('userData'), 'ai_uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

// Save uploaded file to disk
const saveUploadedFile = (fileBuffer, fileName) => {
  const uploadsDir = createUploadsDirIfNeeded();
  const uniqueFileName = `${uuidv4()}-${fileName}`;
  const filePath = path.join(uploadsDir, uniqueFileName);

  fs.writeFileSync(filePath, fileBuffer);

  return {
    fileName: uniqueFileName,
    filePath,
    originalName: fileName
  };
};

// Get list of available models
const getAvailableModels = async () => {
  try {
    if (!anthropic) {
      // Ensure client is initialized
      const initialized = initAnthropicClient();
      if (!initialized) {
        throw new Error('Could not initialize Anthropic client');
      }
    }

    // API endpoint for listing models (using v1 endpoint)
    // The SDK's models.list() method might not exist in older versions
    try {
      // First try using the SDK's models.list() method if available (newer SDK versions)
      const response = await anthropic.models.list({ limit: 20 });

      // Transform to our format
      if (response && response.data) {
        electronLog.info('Models retrieved using SDK list method:', response.data);
        return response.data.map(model => ({
          id: model.id,
          name: model.name || model.id,
          provider: 'anthropic'
        }));
      }
    } catch (sdkError) {
      electronLog.warn('Could not use SDK models.list() method:', sdkError);
      // The SDK might not have the models.list() method, fallback to hardcoded modern models
    }

    // Fallback to hardcoded modern models if API request fails
    electronLog.info('Using latest hardcoded models');
    return [
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'anthropic' },
      { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' }
    ];
  } catch (error) {
    electronLog.error('Error in getAvailableModels, using fallback models:', error);
    // Basic fallback models if everything else fails
    return [
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'anthropic' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' }
    ];
  }
};

// Send message to Anthropic API (non-streaming)
const sendMessage = async (model, messages, apiKey = null) => {
  if (!anthropic) {
    // Bruk den felles API-nøkkelen fra config hvis ingen er oppgitt
    const initialized = initAnthropicClient(apiKey || config.ANTHROPIC_API_KEY);
    if (!initialized) {
      throw new Error('Failed to initialize Anthropic client');
    }
  }

  try {
    // Extract system messages from the array
    const messagesWithoutSystem = messages.filter(msg => msg.role !== 'system');

    // Extract or create system message
    let systemMessage = 'You are Byggbot, a professional assistant for construction and building topics. Ensure your responses use proper formatting with clear structure. When using Markdown, ensure proper spacing between elements (headings, paragraphs, list items). Always preserve line breaks exactly as intended.';

    // Check if there's an existing system message
    const existingSystemMessage = messages.find(msg => msg.role === 'system');
    if (existingSystemMessage) {
      if (typeof existingSystemMessage.content === 'string') {
        systemMessage = existingSystemMessage.content;
        // If it doesn't include formatting instructions, add them
        if (!systemMessage.includes('formatting')) {
          systemMessage += '\n\nEnsure your responses use proper formatting with clear structure. When using Markdown, ensure proper spacing between elements (headings, paragraphs, list items). Always preserve line breaks exactly as intended.';
        }
      } else if (Array.isArray(existingSystemMessage.content)) {
        // Handle case where content is an array of content blocks
        const textBlocks = existingSystemMessage.content
          .filter(block => block.type === 'text')
          .map(block => block.text);

        systemMessage = textBlocks.join('\n\n');

        if (!systemMessage.includes('formatting')) {
          systemMessage += '\n\nEnsure your responses use proper formatting with clear structure. When using Markdown, ensure proper spacing between elements (headings, paragraphs, list items). Always preserve line breaks exactly as intended.';
        }
      }
    }

    const response = await anthropic.messages.create({
      model: model,
      messages: messagesWithoutSystem,
      system: systemMessage,
      max_tokens: 4096
    });

    return response;
  } catch (error) {
    electronLog.error('Error sending message to Anthropic:', error);
    throw error;
  }
};

// Send message to Anthropic API with streaming
const sendMessageStream = async (model, messages, apiKey = null) => {
  if (!anthropic) {
    // Bruk den felles API-nøkkelen fra config hvis ingen er oppgitt
    const initialized = initAnthropicClient(apiKey || config.ANTHROPIC_API_KEY);
    if (!initialized) {
      throw new Error('Failed to initialize Anthropic client');
    }
  }

  try {
    // Don't modify the user's message - instead, add a system message to guide Claude's formatting
    // Create a copy of the messages array to avoid modifying the original
    const messagesWithoutSystem = messages.filter(msg => msg.role !== 'system');

    // Extract or create system message
    let systemMessage = 'You are Byggbot, a professional assistant for construction and building topics. Ensure your responses use proper formatting with clear structure. When using Markdown, ensure proper spacing between elements (headings, paragraphs, list items). Always preserve line breaks exactly as intended.';

    // Check if there's an existing system message
    const existingSystemMessage = messages.find(msg => msg.role === 'system');
    if (existingSystemMessage) {
      if (typeof existingSystemMessage.content === 'string') {
        systemMessage = existingSystemMessage.content;
        // If it doesn't include formatting instructions, add them
        if (!systemMessage.includes('formatting')) {
          systemMessage += '\n\nEnsure your responses use proper formatting with clear structure. When using Markdown, ensure proper spacing between elements (headings, paragraphs, list items). Always preserve line breaks exactly as intended.';
        }
      } else if (Array.isArray(existingSystemMessage.content)) {
        // Handle case where content is an array of content blocks
        const textBlocks = existingSystemMessage.content
          .filter(block => block.type === 'text')
          .map(block => block.text);

        systemMessage = textBlocks.join('\n\n');

        if (!systemMessage.includes('formatting')) {
          systemMessage += '\n\nEnsure your responses use proper formatting with clear structure. When using Markdown, ensure proper spacing between elements (headings, paragraphs, list items). Always preserve line breaks exactly as intended.';
        }
      }
    }

    // Create a streaming request with system parameter at top level
    const stream = await anthropic.messages.create({
      model: model,
      messages: messagesWithoutSystem,
      system: systemMessage,
      max_tokens: 4096,
      stream: true
    });

    return stream;
  } catch (error) {
    electronLog.error('Error sending streaming message to Anthropic:', error);
    throw error;
  }
};

// Process file for message
const processFileForMessage = async (filePath, fileType) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);

    // Check file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Convert file to base64
    const base64Content = fileBuffer.toString('base64');

    // Check if it's a PDF - we need to convert PDFs to images or handle differently
    if (fileType === 'application/pdf') {
      throw new Error('PDF format is not supported. Please convert to image format (JPEG, PNG, GIF, or WebP) before uploading.');
    }

    // Ensure fileType is one of the supported image types
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedTypes.includes(fileType)) {
      throw new Error('Unsupported file type. Only JPEG, PNG, GIF, and WebP images are supported.');
    }

    return {
      type: "image",
      source: {
        type: "base64",
        media_type: fileType,
        data: base64Content
      }
    };
  } catch (error) {
    electronLog.error('Error processing file for message:', error);
    throw error;
  }
};

// Clean up old uploads
const cleanupOldUploads = () => {
  try {
    const uploadsDir = path.join(app.getPath('userData'), 'ai_uploads');
    if (!fs.existsSync(uploadsDir)) return;

    const files = fs.readdirSync(uploadsDir);
    const now = Date.now();

    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);

      // Remove files older than 24 hours
      if (now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    electronLog.error('Error cleaning up old uploads:', error);
  }
};

module.exports = {
  initAnthropicClient,
  saveUploadedFile,
  getAvailableModels,
  sendMessage,
  sendMessageStream,
  processFileForMessage,
  cleanupOldUploads,
  MAX_FILE_SIZE
};