// 完整的 information/index.js 修复代码
// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  try {
    console.log("=== Cloud Function Start ===");
    console.log("Event data:", event);
    
    // 获取用户 OPENID
    const wxContext = cloud.getWXContext();
    const openid = event._openid || wxContext.OPENID;
    
    if (!openid) {
      console.error("openid is empty or undefined");
      return {
        success: false,
        message: "openid is empty"
      };
    }
    
    console.log("Using openid:", openid);
    
    // 格式化时间函数 - 确保输出严格的 YYYY-MM-DD HH:mm:ss 格式（东八区）
    const formatPublishTime = (timeInput) => {
      // 检查是否已经是格式化好的时间字符串 (YYYY-MM-DD HH:mm:ss 或 YYYY/MM/DD HH:mm:ss)
      const timeRegex = /^\d{4}[-/]\d{2}[-/]\d{2} \d{2}:\d{2}:\d{2}$/;
      if (timeInput && typeof timeInput === 'string' && timeRegex.test(timeInput)) {
        // 如果是已格式化的字符串，直接返回，避免重复解析导致时区问题
        console.log("Using already formatted time:", timeInput);
        return timeInput;
      }
      
      let date;
      
      // 处理不同类型的时间输入
      if (timeInput) {
        // 尝试解析输入
        date = new Date(timeInput);
        
        // 如果解析失败，使用当前时间
        if (isNaN(date.getTime())) {
          console.warn("Invalid time input, using current time:", timeInput);
          date = new Date();
        }
      } else {
        // 如果没有输入，使用当前时间
        date = new Date();
      }
      
      // 调整为东八区时间
      const utcTime = date.getTime();
      const offset = 8 * 60 * 60 * 1000; // 东八区偏移量（毫秒）
      const east8Time = new Date(utcTime + offset);
      
      // 严格格式化为 YYYY-MM-DD HH:mm:ss
      const year = east8Time.getUTCFullYear();
      const month = String(east8Time.getUTCMonth() + 1).padStart(2, '0');
      const day = String(east8Time.getUTCDate()).padStart(2, '0');
      const hours = String(east8Time.getUTCHours()).padStart(2, '0');
      const minutes = String(east8Time.getUTCMinutes()).padStart(2, '0');
      const seconds = String(east8Time.getUTCSeconds()).padStart(2, '0');
      
      const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      console.log("Formatted time (East 8):", formattedTime);
      
      return formattedTime;
    };
    
    // 从event中获取数据，优先使用传入的数据，否则使用默认值
    const templateId = event.templateId || '0ladc37q-fQoOMeGh7q2p-nPSAmrPyq2pT_3-roPCV0';
    
    let messageData;
    
    // 根据模板ID判断使用哪种数据结构
    if (templateId === 'RR5iJSiQGZcB-HFfqXCMvNdqsZdCU9wCsLXA-8KhaQc') {
      // 审核结果模板
      const auditResult = event.auditResult || '未知';
      const auditTime = formatPublishTime(event.auditTime);
      const auditor = event.auditor || '系统';
      const taskName = event.taskName || '任务';
      
      messageData = {
        auditResult,
        auditTime,
        auditor,
        taskName,
        templateId
      };
      
      // 确保所有字段符合要求
      const validateAuditData = () => {
        const errors = [];
        
        // 检查 auditResult (phrase2) 长度
        if (auditResult.length > 20) {
          errors.push(`auditResult (phrase2) exceeds 20 characters: ${auditResult}`);
        }
        
        // 检查 auditor (thing8) 长度
        if (auditor.length > 20) {
          errors.push(`auditor (thing8) exceeds 20 characters: ${auditor}`);
        }
        
        return errors;
      };
      
      const validationErrors = validateAuditData();
      if (validationErrors.length > 0) {
        console.error("Message validation failed:", validationErrors);
        return {
          success: false,
          message: "Message validation failed",
          errors: validationErrors
        };
      }
    } else {
      // 任务通知模板
      const taskName = event.taskName || '叮咚～任务更新提醒';
      const publishTime = formatPublishTime(event.publishTime);
      const rewardPoints = event.rewardPoints || 0;
      const isLongTerm = event.isLongTerm || false;
      const initiator = event.initiator || '任务发布人';
      
      // 生成温馨提示
      const warmTip = isLongTerm ? '这是一个长期任务喔~' : '这是一个单次任务，记得按时完成哦！';
      
      messageData = {
        taskName,
        publishTime,
        rewardPoints,
        warmTip,
        initiator,
        templateId
      };
      
      // 确保所有字段符合要求
      const validateMessageData = () => {
        const errors = [];
        
        // 检查 taskName (thing1) 长度
        if (taskName.length > 20) {
          errors.push(`taskName (thing1) exceeds 20 characters: ${taskName}`);
        }
        
        // 检查 warmTip (thing4) 长度
        if (warmTip.length > 20) {
          errors.push(`warmTip (thing4) exceeds 20 characters: ${warmTip}`);
        }
        
        // 检查 initiator (thing14) 长度
        if (initiator.length > 20) {
          errors.push(`initiator (thing14) exceeds 20 characters: ${initiator}`);
        }
        
        // 检查 rewardPoints (number3) 是否为数字
        if (isNaN(Number(rewardPoints))) {
          errors.push(`rewardPoints (number3) is not a number: ${rewardPoints}`);
        }
        
        return errors;
      };
      
      const validationErrors = validateMessageData();
      if (validationErrors.length > 0) {
        console.error("Message validation failed:", validationErrors);
        return {
          success: false,
          message: "Message validation failed",
          errors: validationErrors
        };
      }
    }
    
    console.log("Message data:", messageData);
    
    console.log("Preparing to send subscribe message...");
    
    // 发送订阅消息
    let result;
    try {
      let sendData;
      let pagePath = 'pages/MainPage/index';
      
      // 根据模板ID构建不同的发送数据
      if (templateId === 'RR5iJSiQGZcB-HFfqXCMvNdqsZdCU9wCsLXA-8KhaQc') {
        // 审核结果模板
        sendData = {
          phrase2: {
            value: messageData.auditResult
          },
          time9: {
            value: messageData.auditTime
          },
          thing8: {
            value: messageData.auditor
          }
        };
        pagePath = 'pages/MissionDetail/index?id=' + context._id;
      } else {
        // 任务通知模板
        sendData = {
          thing1: {
            value: messageData.taskName
          },
          time2: {
            value: messageData.publishTime
          },
          number3: {
            value: String(Math.abs(Number(messageData.rewardPoints))).replace(/\.\d+$/, '') // 确保是正整数
          },
          thing4: {
            value: messageData.warmTip
          },
          thing14: {
            value: messageData.initiator
          }
        };
      }
      
      // 修复页面路径构建，使用 event 中的 _id 或默认路径
      if (templateId === 'RR5iJSiQGZcB-HFfqXCMvNdqsZdCU9wCsLXA-8KhaQc') {
        pagePath = 'pages/MissionDetail/index?id=' + (event._id || '');
      }
      
      console.log("准备调用subscribeMessage.send接口...");
      console.log("接口调用参数:", {
        touser: openid,
        templateId: templateId,
        page: pagePath,
        data: sendData,
        miniprogramState: 'formal'
      });
      
      result = await cloud.openapi.subscribeMessage.send({
        touser: openid,
        templateId: templateId,
        page: pagePath,
        data: sendData,
        miniprogramState: 'formal'
      });
      
      console.log("Subscribe message result:", result);
      
      // 检查返回结果是否包含errCode
      if (result && result.errCode) {
        console.warn("订阅消息发送返回错误码:", result.errCode, "错误信息:", result.errMsg);
        if (result.errCode !== 0) {
          return {
            success: false,
            message: `订阅消息发送失败: ${result.errMsg}`,
            error: {
              errCode: result.errCode,
              errMsg: result.errMsg
            }
          };
        }
      }
    } catch (sendError) {
      console.error("Subscribe message send failed:", sendError);
      // 处理发送错误，返回友好信息
      return {
        success: false,
        message: `订阅消息发送失败: ${sendError.errMsg || '未知错误'}`,
        error: {
          errCode: sendError.errCode,
          errMsg: sendError.errMsg
        }
      };
    }
    
    console.log("=== Cloud Function End ===");
    
    // 返回成功结果 - 确保没有 BigInt 类型
    const safeResult = JSON.parse(JSON.stringify(result, (key, value) => {
      // 处理 BigInt 类型
      if (typeof value === 'bigint') {
        return Number(value);
      }
      // 处理其他可能的不安全类型
      if (value === undefined) {
        return null;
      }
      return value;
    }));
    
    return {
      success: true,
      message: "Subscribe message sent successfully",
      result: safeResult
    };
  } catch (err) {
    console.error("Cloud function error:", err);
    // 返回错误结果
    return {
      success: false,
      message: err.errMsg || "Unknown error",
      error: {
        errCode: err.errCode,
        errMsg: err.errMsg
      }
    };
  }
}
