# CSS选择器算法测试文档

## 测试环境
- 测试页面：`test/alpha.html`
- 测试内容：多表格环境下的选择器生成

## 测试场景

### 1. 多表格环境测试

#### 表格结构分析
页面包含3个表格：
1. `#today-airdrops` - 今日空投表格
2. `#upcoming-airdrops` - 空投预告表格  
3. `#promo-tools` - 推荐工具表格

#### 预期选择器改进

**测试元素：第一个表格中的第一个 td 单元格**

改进前可能生成的问题选择器：
- `tr > td:nth-child(1)` ❌ 不唯一，匹配多个表格
- `td` ❌ 匹配页面所有td
- `tbody > tr > td` ❌ 仍不唯一

改进后应生成的正确选择器：
- `#today-airdrops td:nth-of-type(1)` ✅ 通过表格ID确保唯一性
- `#today-airdrops > tbody > tr:nth-of-type(1) > td:nth-of-type(1)` ✅ 完整路径
- `.airdrops-table td:nth-of-type(1)` ⚠️ 如果class唯一

### 2. 算法优先级测试

#### 直接唯一标识符
- ID选择器：`#today-airdrops` (优先级: 1)
- 测试属性：`[data-testid="value"]` (优先级: 2)

#### 祖先基础选择器  
- 祖先ID路径：`#today-airdrops > tbody > tr > td` (优先级: 5)
- 祖先class路径：`.airdrops-table tbody td` (优先级: 6)

#### 兄弟元素感知
对于表格行中的相似元素：
- 父元素+索引：`#today-airdrops > tbody > tr:nth-of-type(2)` (优先级: 2-3)

### 3. 验证标准

#### 唯一性验证
所有生成的选择器必须满足：
```javascript
document.querySelectorAll(selector).length === 1
```

#### 稳定性验证
选择器应该优先使用：
1. ID > 测试属性 > 其他属性 > class > 位置索引
2. 短路径 > 长路径
3. 直接选择器 > 后代选择器

#### 特异性计算
- ID选择器：特异性 = 100
- 属性选择器：特异性 = 10  
- class选择器：特异性 = 10
- 标签选择器：特异性 = 1

## 测试步骤

### 手动测试
1. 打开 `test/alpha.html` 页面
2. 加载浏览器插件
3. 点击插件图标启动选择模式
4. 依次点击以下元素并记录生成的选择器：

#### 测试用例1：表格头部
- 目标：`#today-airdrops` 表格的第一个 `th`
- 期望：`#today-airdrops th:nth-of-type(1)` 或类似唯一选择器

#### 测试用例2：表格数据单元格
- 目标：`#today-airdrops` 表格第一行第一个 `td`
- 期望：`#today-airdrops tbody tr td` 或更具体的索引选择器

#### 测试用例3：不同表格相同结构
- 目标：`#upcoming-airdrops` 表格的第一个 `td`
- 期望：选择器应与测试用例2不同，确保能区分不同表格

#### 测试用例4：嵌套元素
- 目标：表格内的 `.token-symbol` 元素
- 期望：生成包含表格上下文的选择器

### 自动化验证脚本

可以在浏览器控制台运行以下脚本验证选择器唯一性：

```javascript
// 验证选择器唯一性的辅助函数
function testSelector(selector, expectedElement) {
  try {
    const elements = document.querySelectorAll(selector);
    console.log(`选择器: ${selector}`);
    console.log(`匹配数量: ${elements.length}`);
    console.log(`是否唯一: ${elements.length === 1}`);
    console.log(`是否正确: ${elements.length === 1 && elements[0] === expectedElement}`);
    console.log('---');
    return elements.length === 1 && elements[0] === expectedElement;
  } catch (e) {
    console.error(`无效选择器: ${selector}`, e);
    return false;
  }
}

// 测试示例
const firstTd = document.querySelector('#today-airdrops td');
testSelector('#today-airdrops td:nth-of-type(1)', firstTd);
testSelector('#today-airdrops tbody tr td', firstTd);
```

## 成功标准

### 必须满足
1. ✅ 所有生成的选择器在当前页面中唯一
2. ✅ 能够区分不同表格中的相同元素
3. ✅ 优先使用稳定的标识符（ID、属性）

### 应该满足
1. ⭐ 选择器尽可能简短
2. ⭐ 避免过度依赖位置索引
3. ⭐ 提供多个备选选择器方案

### 可以改进
1. 💡 性能优化（减少DOM遍历）
2. 💡 增强兄弟元素相似性检测
3. 💡 支持更多属性类型

## 已知限制

1. `:contains()` 选择器非标准CSS，部分环境不支持
2. 动态内容变化可能影响位置索引稳定性
3. 深度嵌套结构可能产生较长选择器

## 问题排查

### 常见问题
1. **选择器不唯一**：检查祖先路径是否包含唯一标识符
2. **选择器过长**：优化路径算法，减少不必要的层级
3. **兄弟元素混淆**：加强结构特征分析

### 调试技巧
1. 在控制台查看 `generateMultipleSelectors(element)` 返回的所有选择器
2. 使用 `isSelectorUnique(selector)` 验证选择器唯一性
3. 检查 `isElementInSimilarSiblingsList(element)` 的返回值
