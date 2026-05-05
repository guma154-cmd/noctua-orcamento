const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const { expect } = require('chai');
const sinon = require('sinon');
const AIOrchestrator = require('../services/ai/orchestrator');
const matrix = require('../services/ai/matrix');

describe('AI Orchestrator', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('should fallback to the next provider if a model is decommissioned', async () => {
    const groqProvider = {
      name: 'Groq',
      execute: sinon.stub().rejects(new Error('The model `test-decommissioned-model` has been decommissioned'))
    };
    const geminiProvider = {
      name: 'Gemini',
      execute: sinon.stub().resolves('Success from Gemini')
    };

    const testMatrix = {
      "TEXT": [
        { provider: groqProvider, priority: 1, params: { model: 'test-decommissioned-model' } },
        { provider: geminiProvider, priority: 2, params: { model: 'gemini-pro' } }
      ]
    };

    const result = await AIOrchestrator.runWithRotation(testMatrix['TEXT'], (provider, config) => provider.execute('prompt', 'system', config.params.model), null, 'TEXT');

    expect(result.content).to.equal('Success from Gemini');
    expect(result.provider).to.equal('Gemini');
    expect(groqProvider.execute.calledOnce).to.be.true;
    expect(geminiProvider.execute.calledOnce).to.be.true;
    expect(result.attempts).to.have.lengthOf(1);
    expect(result.attempts[0].error).to.include('Model Decommissioned');
  });
});
