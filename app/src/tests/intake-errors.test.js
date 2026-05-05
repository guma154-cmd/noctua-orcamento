const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const { expect } = require('chai');
const sinon = require('sinon');
const { classificarIntencao } = require('../agents/intake');
const aiService = require('../services/ai');

describe('Intake Agent - Error Handling', () => {

  let downloadTelegramFileStub;
  let extractConsolidatedVisionStub;

  beforeEach(() => {
    // Evitar chamadas reais de download e visão
    downloadTelegramFileStub = sinon.stub(require('../agents/intake'), 'downloadTelegramFile').resolves('/fake/path/image.jpg');
    extractConsolidatedVisionStub = sinon.stub(aiService, 'extractConsolidatedVision');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('deve retornar uma mensagem de erro útil se a imagem for inválida (visão retorna vazio)', async () => {
    const ctx = {
      telegram: {
        getFileLink: sinon.stub().resolves({ href: 'https://fake.telegram.org/file.jpg' })
      },
      reply: sinon.stub().resolves(),
      message: {
        photo: [{ file_id: 'invalid_photo_id', file_size: 1000 }],
      },
    };
    
    // Simula a falha da extração retornando um resultado nulo
    extractConsolidatedVisionStub.resolves(null);
    
    const result = await classificarIntencao(ctx);

    expect(result.intent).to.equal('erro');
    expect(result.content).to.include('Não foi possível extrair dados da imagem.');
  });

  it('deve retornar uma mensagem de erro específica quando a API key do Gemini é inválida', async () => {
    const ctx = {
      telegram: {
        getFileLink: sinon.stub().resolves({ href: 'https://fake.telegram.org/file.jpg' })
      },
      reply: sinon.stub().resolves(),
      message: {
        photo: [{ file_id: 'photo_id', file_size: 159000 }],
      },
    };

    // Simula o erro de API key
    extractConsolidatedVisionStub.rejects(new Error('API key not valid'));

    const result = await classificarIntencao(ctx);

    expect(result.intent).to.equal('erro');
    expect(result.content).to.equal('❌ Falha na extração: A chave de API do Gemini não é válida. Verifique o .env.');
  });

  it('deve retornar uma mensagem de erro se a imagem for muito grande', async () => {
    const ctx = {
      message: {
        photo: [{ file_id: 'large_photo_id', file_size: 5 * 1024 * 1024 }], // 5MB
      },
    };

    // A lógica de tamanho está no `intake` agent, então a simulação de erro pode ser genérica
    extractConsolidatedVisionStub.resolves(null); 

    const result = await classificarIntencao(ctx);

    expect(result.intent).to.equal('erro');
    expect(result.content).to.equal('❌ Falha na extração: A imagem é muito grande. Envie imagens menores que 4MB.');
  });

  it('deve lidar com um erro genérico da API de visão e informar o usuário', async () => {
    const ctx = {
      telegram: {
        getFileLink: sinon.stub().resolves({ href: 'https://fake.telegram.org/file.jpg' })
      },
      reply: sinon.stub().resolves(),
      message: {
        photo: [{ file_id: 'generic_error_photo', file_size: 12345 }],
      },
    };
    
    const errorMessage = 'Ocorreu um erro interno na API de visão.';
    extractConsolidatedVisionStub.rejects(new Error(errorMessage));

    const result = await classificarIntencao(ctx);

    expect(result.intent).to.equal('erro');
    expect(result.content).to.include(`❌ Falha na extração: ${errorMessage}`);
  });

});
