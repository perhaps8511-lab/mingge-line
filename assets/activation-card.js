'use strict';
var H1 = { gift: '有人為您留下了一件收藏。', self: '您留下了一件收藏。' };
var giftBtn = document.getElementById('btn-gift');
var selfBtn = document.getElementById('btn-self');
var h1 = document.getElementById('card-h1');
function setVariant(v){
  h1.textContent = H1[v];
  giftBtn.setAttribute('aria-pressed', String(v === 'gift'));
  selfBtn.setAttribute('aria-pressed', String(v === 'self'));
}
giftBtn.addEventListener('click', function(){ setVariant('gift'); });
selfBtn.addEventListener('click', function(){ setVariant('self'); });
