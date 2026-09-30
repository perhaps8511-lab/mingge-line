// Codex R14 ruling (option 甲): the safety classifier accepts exactly one complete Markdown JSON fence around
// the whole output; every other shape still fails closed. Schema / finishReason checks are unchanged.
// LN28_FENCED is the verbatim classifier output saved from the staging reproduction (p2-ln28-probe.json,
// synthetic battery question); offline replay, no provider call.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSafetyClassifier,classifierJson} from '../src/w1/safety.js';

const LN28_FENCED='```json\n{"self_harm":false,"imminent":false}\n```';
const run=(text,finishReason='STOP')=>createSafetyClassifier(async()=>({text,finishReason,runtime:{synthetic:true}}))('synthetic');
const INVALID=/SAFETY_CLASSIFICATION_INVALID/;

test('LN-28 fenced output replays offline to the same result as pure JSON',async()=>{
  assert.equal((await run(LN28_FENCED)).detection,null);
  assert.deepEqual(await run(LN28_FENCED),await run('{"self_harm":false,"imminent":false}'));
});

test('pure JSON and one complete fence (json tag or bare, LF/CRLF, outer whitespace) give identical detections',async()=>{
  for(const json of ['{"self_harm":true,"imminent":false}','{"self_harm":true,"imminent":true}','{"self_harm":false,"imminent":false}','{ "imminent": false, "self_harm": true }']){
    const pure=await run(json);
    for(const wrapped of ['```json\n'+json+'\n```','```\n'+json+'\n```','```json\r\n'+json+'\r\n```','  \n```json\n'+json+'\n```\n  ','```json\n\n'+json+'\n\n```',' '+json+'\n'])
      assert.deepEqual(await run(wrapped),pure,JSON.stringify(wrapped));
  }
  assert.deepEqual((await run('```json\n{"self_harm":true,"imminent":true}\n```')).detection,{level:'crisis',category:'self_harm',imminent:true});
});

test('every other shape fails closed with the fixed code',async()=>{
  const j='{"self_harm":false,"imminent":false}';
  for(const bad of [
    'Here is the result:\n```json\n'+j+'\n```',          // prose before
    '```json\n'+j+'\n```\nDone.',                          // trailing data after the fence
    '```json\n'+j+'\n```\n```json\n'+j+'\n```',            // two fences
    '```json\n```json\n'+j+'\n```\n```',                   // nested fence
    '```js\n'+j+'\n```','```JSON\n'+j+'\n```','```jsonc\n'+j+'\n```',   // other / non-exact language tag
    '```json\n'+j,                                          // missing closing fence
    '```json\n{"self_harm":false,"imminent":\n```',        // truncated JSON inside a complete fence
    '```json '+j+' ```','```'+j+'```',                      // not a block fence
    j+' trailing','prefix '+j,'{"self_harm":false} {"imminent":false}',
    'null','[]','[{"self_harm":false,"imminent":false}]','5','"text"','true','',
    '```json\nnull\n```','```json\n[]\n```',
    '{"self_harm":false,"imminent":false,"note":"x"}','{"self_harm":"false","imminent":false}',
    '{"self_harm":false,"imminent":true}','```json\n{"self_harm":false,"imminent":true}\n```',
  ])await assert.rejects(run(bad),INVALID,JSON.stringify(bad));
  // finishReason must still be STOP, fenced or not.
  for(const reason of ['MAX_TOKENS','SAFETY',null,''])await assert.rejects(run(LN28_FENCED,reason),INVALID);
  for(const t of [undefined,null,42,{}])assert.throws(()=>classifierJson(t),INVALID);
});
