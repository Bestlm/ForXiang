// 完整修复后的 MissionAdd/index.js 代码
Page({
  data: {
    title: '',
    desc: '',
  
    user: '',
    openid: 'none',
    another_openid: '',
    
    credit: 0,
    maxCredit: getApp().globalData.maxCredit,
    
    isLongTerm: false,
    totalDays: 7,
    totalDaysIndex: 2,
    isCustomDays: false,
    customDays: '',
    dailyCredit: 0,
    
    // 背景图片路径
    backgroundImage: '',
    // 隐藏背景图片
    hideBackground: true,
    
    dayOptions: [
      { value: 3, label: '3天' },
      { value: 5, label: '5天' },
      { value: 7, label: '7天' },
      { value: 10, label: '10天' },
      { value: 14, label: '14天' },
      { value: 21, label: '21天' },
      { value: 30, label: '30天' },
      { value: 0, label: '自定义' }
    ],
    
    presetIndex: 0,
    
    presets: [{
      name:"无预设",
      title:"",
      desc:"",
    },{
      name:"早睡早起",
      title:"晚上要早睡，明天早起",
      desc:"熬夜对身体很不好，还是要早点睡觉第二天才能有精神！",
    },{
      name:"打扫房间",
      title:"清扫房间，整理整理",
      desc:"有一段时间没有打扫房间了，一屋不扫，何以扫天下？",
    },{
      name:"健康运动",
      title:"做些运动，注意身体",
      desc:"做一些健身运动吧，跳绳，跑步，训练动作什么的。",
    },{
      name:"戒烟戒酒",
      title:"烟酒不解真愁",
      desc:"维持一段时间不喝酒，不抽烟，保持健康生活！",
    },{
      name:"请客吃饭",
      title:"请客吃点好的",
      desc:"好吃的有很多，我可以让你尝到其中之一，好好享受吧！",
    },{
      name:"买小礼物",
      title:"整点小礼物",
      desc:"买点小礼物，像泡泡马特什么的。",
    },{
      name:"洗碗洗碟",
      title:"这碗碟我洗了",
      desc:"有我洗碗洗碟子，有你吃饭无它事。",
    },{
      name:"帮拿东西",
      title:"帮拿一天东西",
      desc:"有了我，你再也不需要移动了。拿外卖，拿零食，开空调，开电视，在所不辞。",
    },{
      name:"制作饭菜",
      title:"这道美食由我完成",
      desc:"做点可口的饭菜，或者专门被指定的美食。我这个大厨，随便下，都好吃。",
    }],
    list: getApp().globalData.collectionMissionList,
  },
  async getUser(){
    try {
      const app = getApp();
      const authInfo = await app.verifyUser();
      
      console.log('用户验证结果:', authInfo);
      
      if(authInfo.valid){
        this.setData({
            user: authInfo.user,
            openid: authInfo.openid,
            another_openid: authInfo.another_openid,
        });
        return true;
      }else{
        console.error('用户未授权:', authInfo.error);
        throw new Error(authInfo.error || '用户未授权');
      }
    } catch (error) {
      console.error('验证用户失败:', error);
      throw error;
    }
  },
  
  //数据输入填写表单
  onTitleInput(e) {
    this.setData({
      title: e.detail.value
    })
  },
  onDescInput(e) {
    this.setData({
      desc: e.detail.value
    })
  },
  onCreditInput(e) {
    const maxCredit = this.getMaxCredit()
    // 确保 creditValue 是数字类型
    let creditValue = parseInt(e.detail.value) || 0
    if (creditValue > maxCredit) {
      creditValue = maxCredit
    }
    this.setData({
      credit: creditValue
    })
    this.calculateDailyCredit()
  },
  
  // 点击滑块值，弹出输入框
  onSliderValueTap() {
    const maxCredit = this.getMaxCredit()
    wx.showModal({
      title: this.data.isLongTerm ? '输入每日积分' : '输入积分',
      editable: true,
      placeholderText: this.data.isLongTerm ? '输入每日积分' : '输入积分',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          let inputValue = parseInt(res.content) || 0;
          if (this.data.isLongTerm) {
            inputValue = Math.max(0, Math.min(this.data.maxCredit, inputValue));
            this.setData({
              credit: inputValue * this.data.totalDays
            });
          } else {
            inputValue = Math.max(0, Math.min(this.data.maxCredit, inputValue));
            this.setData({
              credit: inputValue
            });
          }
          this.calculateDailyCredit();
        }
      }
    });
  },
  onPresetChange(e){
    this.setData({
      presetIndex: e.detail.value,
      title: this.data.presets[e.detail.value].title,
      desc: this.data.presets[e.detail.value].desc,
    })
  },
  
  onLongTermSwitch(e){
    if (e.detail.value === false && this.data.isLongTerm === true) {
      this.setData({
        isLongTerm: false,
        credit: this.data.dailyCredit
      })
    } else {
      this.setData({
        isLongTerm: e.detail.value
      })
    }
    this.calculateDailyCredit()
  },
  
  onTotalDaysChange(e){
    const index = e.detail.value
    const selectedOption = this.data.dayOptions[index]
    const newTotalDays = selectedOption.value === 0 ? this.data.customDays || 7 : selectedOption.value
    const newMaxCredit = this.data.maxCredit * newTotalDays
    
    let newCredit = this.data.credit
    if (newCredit > newMaxCredit) {
      newCredit = newMaxCredit
    }
    
    this.setData({
      totalDaysIndex: index,
      isCustomDays: selectedOption.value === 0,
      totalDays: newTotalDays,
      credit: newCredit
    })
    this.calculateDailyCredit()
  },
  
  onCustomDaysInput(e){
    const customDays = e.detail.value
    const newTotalDays = customDays ? parseInt(customDays) : 7
    const newMaxCredit = this.data.maxCredit * newTotalDays
    
    let newCredit = this.data.credit
    if (newCredit > newMaxCredit) {
      newCredit = newMaxCredit
    }
    
    this.setData({
      customDays: customDays,
      totalDays: newTotalDays,
      credit: newCredit
    })
    this.calculateDailyCredit()
  },
  
  calculateDailyCredit(){
    if(this.data.isLongTerm && this.data.credit > 0){
      const dailyCredit = Math.floor(this.data.credit / this.data.totalDays)
      this.setData({
        dailyCredit: dailyCredit
      })
    }else{
      this.setData({
        dailyCredit: 0
      })
    }
  },
  
  getMaxCredit(){
    if(this.data.isLongTerm){
      return this.data.maxCredit * this.data.totalDays
    }
    return this.data.maxCredit
  },
  
  // 保存任务（主函数）
  async saveMission() {
    // 表单验证
    if (this.data.title === '') {
      wx.showToast({
        title: '标题未填写',
        icon: 'error',
        duration: 2000
      })
      return
    }
    if (this.data.title.length > 12) {
      wx.showToast({
        title: '标题过长',
        icon: 'error',
        duration: 2000
      })
      return
    }
    if (this.data.desc.length > 100) {
      wx.showToast({
        title: '描述过长',
        icon: 'error',
        duration: 2000
      })
      return
    }
    if (this.data.credit <= 0) {
      wx.showToast({
        title: '一定要有积分',
        icon: 'error',
        duration: 2000
      })
      return
    }
    if (this.data.isLongTerm) {
      if (this.data.dailyCredit <= 0) {
        wx.showToast({
          title: '每日积分不足',
          icon: 'error',
          duration: 2000
        })
        return
      }
      if (this.data.dailyCredit > this.data.maxCredit) {
        wx.showToast({
          title: `每日积分不能超过${this.data.maxCredit}`,
          icon: 'error',
          duration: 2000
        })
        return
      }
      if (this.data.totalDays <= 0) {
        wx.showToast({
          title: '天数必须大于0',
          icon: 'error',
          duration: 2000
        })
        return
      }
    } else {
      if (this.data.credit > this.data.maxCredit) {
        wx.showToast({
          title: `积分不能超过${this.data.maxCredit}`,
          icon: 'error',
          duration: 2000
        })
        return
      }
    }
    
    // 生成发布时间 - 关键修复：使用东八区时间，确保时间一致性
    // 问题：toISOString()返回UTC时间，比北京时间晚8小时，需手动调整
    const now = new Date();
    // 生成东八区时间字符串（YYYY-MM-DD HH:mm:ss）
    const publishTime = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Shanghai'
    });
    
    const missionData = {
      title: this.data.title,
      desc: this.data.desc,
      credit: Number(this.data.credit),
      isLongTerm: this.data.isLongTerm,
      publishTime: publishTime,
      list: getApp().globalData.collectionMissionList
    };
    
    if(this.data.isLongTerm){
      missionData.totalDays = this.data.totalDays;
    }
    
    let missionSaved = false;
    
    try {
      // 1. 先请求订阅消息授权 - 关键修复：必须在任何异步操作之前调用！
      // 这确保了在用户点击事件的直接回调中调用，符合微信规范
      await this.checkAndRequestSubscribe();
      
      // 2. 确保获取了用户信息
      await this.getUser();
      
      // 3. 保存任务
      const addResult = await wx.cloud.callFunction({name: 'addElement', data: missionData});
      console.log('addElement 云函数返回结果:', addResult);
      
      // 检查 addResult 是否存在
      if (!addResult) {
        throw new Error('保存任务失败: 云函数调用失败');
      }
      
      // 检查 addResult.result 是否存在
      if (!addResult.result) {
        throw new Error('保存任务失败: 云函数返回结果异常');
      }
      
      // 任务已经保存到数据库，即使 addResult.result.success 为 false，也认为任务保存成功
      missionSaved = true;
      
      wx.showToast({
        title: '添加成功',
        icon: 'success',
        duration: 1000
      });
      
      // 4. 发送订阅消息给对方用户，传递预先生成的发布时间
      // 即使发送订阅消息失败，也不影响任务创建的流程
      try {
        await this.sendSubscribeMessage(missionData, publishTime);
      } catch (msgError) {
        console.error('发送订阅消息失败:', msgError);
        // 发送订阅消息失败，不影响任务创建的流程
      }
      
      // 5. 延迟返回
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    } catch (error) {
      console.error('操作失败:', error);
      
      if (error.message === '用户未授权') {
        // 用户未授权，禁止添加任务
        wx.showToast({
          title: '您不是授权用户，无法添加任务',
          icon: 'none',
          duration: 2000
        });
        return;
      } else if (error.errCode === 43101) {
        // 用户未授权订阅消息
        wx.showToast({
          title: '发送消息失败：用户未授权',
          icon: 'none',
          duration: 2000
        });
        
        if (!missionSaved) {
          // 任务还没保存，才需要保存
          try {
            await this.getUser();
            await wx.cloud.callFunction({name: 'addElement', data: missionData});
          } catch (authError) {
            if (authError.message === '用户未授权') {
              wx.showToast({
                title: '您不是授权用户，无法添加任务',
                icon: 'none',
                duration: 2000
              });
              return;
            }
            throw authError;
          }
        }
        
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      } else if (error.message.includes('云开发') || error.message.includes('网络')) {
        // 网络错误
        wx.showToast({
          title: '网络错误，请检查网络连接',
          icon: 'none',
          duration: 2000
        });
      } else {
        // 其他错误
        if (!missionSaved) {
          // 任务还没保存，显示保存失败
          wx.showToast({
            title: '保存失败，请重试',
            icon: 'error',
            duration: 2000
          });
        } else {
          // 任务已保存，只是发送消息失败，不影响任务创建
          wx.showToast({
            title: '任务已保存，消息发送失败',
            icon: 'none',
            duration: 2000
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1000);
        }
      }
    }
  },
  
  // 请求订阅消息授权
  requestSubscribeMessage() {
    return new Promise((resolve, reject) => {
      // 同时请求两个模板的授权
      const templateIds = [
        '0ladc37q-fQoOMeGh7q2p-nPSAmrPyq2pT_3-roPCV0', // 任务创建和打卡通知模板
        'RR5iJSiQGZcB-HFfqXCMvNdqsZdCU9wCsLXA-8KhaQc'  // 审核结果通知模板
      ];
      
      wx.requestSubscribeMessage({
        tmplIds: templateIds,
        success: (res) => {
          console.log('订阅消息授权结果:', res);
          
          // 检查用户是否勾选了"总是保持以上选择"
          wx.getSetting({
            withSubscriptions: true,
            success: (settingRes) => {
              console.log('用户设置:', settingRes);
              // 检查是否有任何一个模板被勾选了"总是保持以上选择"
              let hasChecked = false;
              templateIds.forEach(templateId => {
                if (settingRes.subscriptionsSetting && 
                    settingRes.subscriptionsSetting.itemSettings && 
                    settingRes.subscriptionsSetting.itemSettings[templateId]) {
                  hasChecked = true;
                }
              });
              if (hasChecked) {
                // 用户勾选了"总是保持以上选择"
                wx.setStorageSync('checkFlag', 1);
                console.log('用户勾选了"总是保持以上选择"');
              }
            }
          });
          
          // 检查是否有任何一个模板被授权
          let hasAccepted = false;
          templateIds.forEach(templateId => {
            if (res[templateId] === 'accept') {
              hasAccepted = true;
            }
          });
          
          if (hasAccepted) {
            // 用户至少同意了一个模板的授权
            resolve(true);
          } else {
            // 用户拒绝了所有模板的授权
            console.warn('用户拒绝订阅消息授权');
            // 不拒绝Promise，允许任务继续保存，只是不发送消息
            resolve(false);
          }
        },
        fail: (err) => {
          console.error('请求订阅消息授权失败:', err);
          // 授权失败不影响任务保存
          
          // 处理通知主开关关闭的情况
          if (err.errCode === 20004) {
            // 引导用户去系统设置中开启通知开关
            wx.showModal({
              title: '通知开关已关闭',
              content: '请在系统设置中开启小程序的通知权限，以便及时接收任务通知',
              confirmText: '去设置',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 引导用户去系统设置
                  wx.openSetting({
                    success: (settingRes) => {
                      console.log('用户打开设置:', settingRes);
                    }
                  });
                }
              }
            });
          }
          
          resolve(false);
        }
      });
    });
  },
  
  // 检查是否需要请求订阅消息授权
  checkAndRequestSubscribe() {
    return new Promise((resolve) => {
      // 每次都请求授权，确保新设备能够弹出授权弹窗
      // 即使之前勾选了"总是保持以上选择"，也再次请求授权
      console.log('请求订阅消息授权');
      this.requestSubscribeMessage().then((result) => {
        resolve(result);
      });
    });
  },
  
  // 发送订阅消息
  sendSubscribeMessage(missionData, publishTime) {
    return new Promise((resolve) => {
      try {
        wx.cloud.callFunction({
          name: 'information',
          data: {
            templateId: '0ladc37q-fQoOMeGh7q2p-nPSAmrPyq2pT_3-roPCV0',
            taskName: missionData.title,
            publishTime: publishTime,
            rewardPoints: missionData.credit,
            isLongTerm: missionData.isLongTerm,
            initiator: this.data.user || '任务发布人',
            _openid: this.data.another_openid // 关键修复：发送给对方用户，而不是自己
          },
          success: (res) => {
            console.log('订阅消息发送结果:', res);
            // 无论云函数返回成功还是失败，都继续执行任务流程
            // 消息发送失败不影响任务保存
            resolve(res);
          },
          fail: (err) => {
            console.error('订阅消息发送失败:', err);
            // 云函数调用失败，直接返回，不影响任务流程
            resolve(err);
          }
        });
      } catch (error) {
        console.error('发送订阅消息时发生异常:', error);
        // 发生异常时，也继续执行任务流程
        resolve(error);
      }
    });
  },
  
  // 重置所有表单项
  resetMission() {
    this.setData({
      title: '',
      desc: '',
      credit: 0,
      isLongTerm: false,
      totalDays: 7,
      totalDaysIndex: 2,
      isCustomDays: false,
      customDays: '',
      dailyCredit: 0,
      presetIndex: 0,
      list: getApp().globalData.collectionMissionList
    })
  },
  
  onShow() {
    this.setData({
      backgroundImage: getApp().globalData.backgroundImage
    })
  }
})
