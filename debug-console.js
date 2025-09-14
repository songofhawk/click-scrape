// 控制台调试脚本 - 在alpha.html页面中运行此脚本来测试新算法

console.log('🔧 CSS选择器算法测试');
console.log('================');

// 测试辅助函数
function testElementSelector(element, elementDescription) {
  console.log(`\n📍 测试元素: ${elementDescription}`);
  console.log(`   标签: ${element.tagName}`);
  console.log(`   ID: ${element.id || '无'}`);
  console.log(`   Class: ${element.className || '无'}`);
  
  try {
    // 调用新的选择器生成算法
    const selectors = generateMultipleSelectors(element);
    
    console.log(`   生成选择器数量: ${selectors.length}`);
    
    selectors.forEach((selectorObj, index) => {
      const isUnique = document.querySelectorAll(selectorObj.selector).length === 1;
      const correctlyTargets = document.querySelector(selectorObj.selector) === element;
      
      console.log(`   ${index + 1}. [${selectorObj.type}] ${selectorObj.selector}`);
      console.log(`      优先级: ${selectorObj.priority}`);
      console.log(`      特异性: ${selectorObj.specificity || 'N/A'}`);
      console.log(`      唯一性: ${isUnique ? '✅' : '❌'}`);
      console.log(`      正确性: ${correctlyTargets ? '✅' : '❌'}`);
      console.log(`      描述: ${selectorObj.description}`);
    });
    
    // 显示最佳选择器
    if (selectors.length > 0) {
      const best = selectors[0];
      console.log(`   🏆 最佳选择器: ${best.selector}`);
    }
    
  } catch (error) {
    console.error(`   ❌ 错误:`, error);
  }
}

// 测试案例
console.log('\n🎯 开始测试...');

// 测试1: 第一个表格的thead
const todayTableHead = document.querySelector('#today-airdrops thead th');
if (todayTableHead) {
  testElementSelector(todayTableHead, '今日空投表格头部');
}

// 测试2: 第一个表格的第一个数据单元格
const todayTableFirstTd = document.querySelector('#today-airdrops tbody td');
if (todayTableFirstTd) {
  testElementSelector(todayTableFirstTd, '今日空投表格第一个数据单元格');
}

// 测试3: 第二个表格的第一个数据单元格
const upcomingTableFirstTd = document.querySelector('#upcoming-airdrops tbody td');
if (upcomingTableFirstTd) {
  testElementSelector(upcomingTableFirstTd, '空投预告表格第一个数据单元格');
}

// 测试4: 第三个表格的第一个数据单元格
const promoTableFirstTd = document.querySelector('#promo-tools tbody td');
if (promoTableFirstTd) {
  testElementSelector(promoTableFirstTd, '推荐工具表格第一个数据单元格');
}

// 测试5: 嵌套元素 - token-symbol
const tokenSymbol = document.querySelector('.token-symbol');
if (tokenSymbol) {
  testElementSelector(tokenSymbol, 'Token Symbol 元素');
}

// 测试6: 链接元素
const tokenLink = document.querySelector('.token-link');
if (tokenLink) {
  testElementSelector(tokenLink, 'Token Link 元素');
}

console.log('\n✅ 测试完成');

// 提供交互式测试函数
console.log('\n🛠️ 交互式测试:');
console.log('选择任意元素并运行: testElementSelector(element, "描述")');
console.log('例如: testElementSelector(document.querySelector("h1"), "页面标题")');

// 全局化测试函数以便在控制台中使用
window.testElementSelector = testElementSelector;
