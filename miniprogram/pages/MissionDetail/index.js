Page({
  // 保存任务的 _id 和详细信息
  data: {
    _id: '',
    mission: null,
    dateStr: '',
    creditPercent: 0,
    from: '',
    to: '',
    maxCredit: 0,
    list: [],
    todayStr: '',
    isTodayChecked: false,
    currentOpenId: '',
    checkinStatus: '',
    // 背景图片路径
    backgroundImage: '',
    // 隐藏背景图片
    hideBackground: true,
  },

  onLoad(options) {
    if (options && options.id) {
      this.setData({
        _id: options.id
      })
    }
    
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // 安全获取app实例和globalData
    let backgroundImage = '';
    let maxCredit = 100; // 默认值
    let collectionMissionList = 'MissionList'; // 默认集合名称
    
    try {
      const app = getApp();
      if (app && app.globalData) {
        backgroundImage = app.globalData.backgroundImage || '';
        maxCredit = app.globalData.maxCredit || 100;
        collectionMissionList = app.globalData.collectionMissionList || 'MissionList';
      }
    } catch (error) {
      console.error('获取全局数据失败:', error);
    }
    
    this.setData({
      todayStr: todayStr,
      backgroundImage: backgroundImage,
      maxCredit: maxCredit,
      list: collectionMissionList
    });
  },
  
  getDate(dateStr){
    return new Date(dateStr)
  },

  formatDateTime(date){
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}/${month}/${day} | ${hours}:${minutes}:${seconds}`
  },

  // 验证用户身份
  async verifyUser() {
    const app = getApp();
    const authInfo = await app.verifyUser();
    
    console.log('用户验证结果:', authInfo);
    
    if(authInfo.valid){
      this.setData({
          user: authInfo.user,
          currentOpenId: authInfo.openid,
          another_openid: authInfo.another_openid,
      });
      return true;
    }else{
      console.error('用户未授权:', authInfo.error);
      throw new Error(authInfo.error || '用户未授权');
    }
  },

  // 根据 _id 值查询并显示任务
  async onShow() {
    if (this.data._id.length > 0) {
      try {
        // 验证用户身份
        await this.verifyUser();
        
        const app = getApp();
        const currentOpenId = this.data.currentOpenId;
        
        const data = await app.callFunction({name: 'getElementById', data: {_id: this.data._id, list: this.data.list}});
        if (!data || !data.result || !data.result.data || data.result.data.length === 0) {
          console.error('未找到任务数据:', data);
          wx.showToast({
            title: '未找到任务数据',
            icon: 'none',
            duration: 2000
          });
          return;
        }
        const mission = data.result.data[0];
        if (!mission) {
          console.error('未找到任务数据');
          wx.showToast({
            title: '未找到任务数据',
            icon: 'none',
            duration: 2000
          });
          return;
        }
        
        console.log('当前用户openid:', currentOpenId);
        console.log('任务发布者openid:', mission._openid);
        const date = this.getDate(mission.date);
        
        // 根据openid设置用户信息
        const authInfo = app.globalData.authInfo;
        let from = '';
        let to = '';
        if (authInfo && authInfo.openid) {
          if(mission._openid === authInfo.openid){
            from = authInfo.user;
            to = authInfo.user === '然然' ? '小向' : '然然';
          }else if(mission._openid === authInfo.another_openid){
            from = authInfo.user === '然然' ? '小向' : '然然';
            to = authInfo.user;
          }
        }
        
        // 获取当前审核用户的真实名字
        const currentUser = this.data.user || '系统';
        
        this.setData({
          mission: mission,
          dateStr: this.formatDateTime(date),
          creditPercent: (mission.credit / (app.globalData.maxCredit || 100)) * 100,
          from: from,
          to: to,
          currentUser: currentUser // 保存当前审核用户的真实名字
        });

        if(mission.isLongTerm && mission.dailyRecords && Array.isArray(mission.dailyRecords)){
          // 获取今日打卡记录的状态
          const todayRecord = mission.dailyRecords.find(record => record.date === this.data.todayStr);
          let checkinStatus = '';
          if (todayRecord) {
            checkinStatus = todayRecord.status || '';
          }
          
          // 为打卡记录添加格式化的日期时间字段
          const formattedMission = Object.assign({}, mission);
          formattedMission.dailyRecords = mission.dailyRecords.map(record => {
            // 创建记录的副本
            const formattedRecord = Object.assign({}, record);
            // 检查记录是否有时间信息
          if (record.createTime) {
            // 如果有时间信息，使用它
            try {
              const checkinDate = new Date(record.createTime);
              if (!isNaN(checkinDate.getTime())) {
                formattedRecord.formattedDate = this.formatDateTime(checkinDate);
              } else {
                // 如果时间格式无效，使用日期
                formattedRecord.formattedDate = record.date;
              }
            } catch (error) {
              console.error('解析打卡时间失败:', error);
              formattedRecord.formattedDate = record.date;
            }
          } else {
            // 如果没有时间信息，使用日期
            formattedRecord.formattedDate = record.date;
          }
            return formattedRecord;
          });
          
          // 更新任务数据
          this.setData({
            mission: formattedMission,
            isTodayChecked: checkinStatus === 'approved',
            checkinStatus: checkinStatus
          });
        } else if (mission.checkinRecords && Array.isArray(mission.checkinRecords)) {
          // 为普通任务的完成记录添加格式化的日期时间字段
          const formattedMission = Object.assign({}, mission);
          formattedMission.checkinRecords = mission.checkinRecords.map(record => {
            // 创建记录的副本
            const formattedRecord = Object.assign({}, record);
            // 检查记录是否有时间信息
          if (record.createTime) {
            // 如果有时间信息，使用它
            try {
              const checkinDate = new Date(record.createTime);
              if (!isNaN(checkinDate.getTime())) {
                formattedRecord.formattedDate = this.formatDateTime(checkinDate);
              } else {
                // 如果时间格式无效，使用当前时间
                formattedRecord.formattedDate = this.formatDateTime(new Date());
              }
            } catch (error) {
              console.error('解析打卡时间失败:', error);
              formattedRecord.formattedDate = this.formatDateTime(new Date());
            }
          } else {
            // 如果没有时间信息，使用当前时间
            formattedRecord.formattedDate = this.formatDateTime(new Date());
          }
            return formattedRecord;
          });
          
          // 更新任务数据
          this.setData({
            mission: formattedMission
          });
        }
      } catch (error) {
        console.error('获取任务详情失败:', error);
        const app = getApp();
        if (error.message === '用户未授权') {
          app.showToast({
            title: '您不是授权用户，无法访问任务详情',
            icon: 'none'
          });
        } else if (error.message.includes('云开发') || error.message.includes('网络')) {
          app.showToast({
            title: '网络错误，请检查网络连接',
            icon: 'none'
          });
        } else {
          app.showToast({
            title: '获取任务详情失败',
            icon: 'none'
          });
        }
      }
    }
  },
  
  // 审核打卡记录
  async auditCheckin(recordIndex, action) {
    // 参数有效性检查
    if (typeof recordIndex !== 'number' || (action !== 'approve' && action !== 'reject')) {
      console.error('参数错误:', recordIndex, action);
      wx.showToast({
        title: '参数错误',
        icon: 'error',
        duration: 2000
      });
      return;
    }
    
    // 检查订阅消息授权状态
    this.checkSubscribeMessageAuth();
    
    wx.showLoading({
      title: '处理中...',
    });
    
    try {
      // 传递必要的云函数调用参数
      const res = await wx.cloud.callFunction({
        name: 'auditCheckin',
        data: {
          _id: this.data._id,
          list: this.data.list,
          recordIndex: recordIndex,
          action: action
        }
      });
      
      wx.hideLoading();
      
      // 检查返回结果的有效性
      if (res && res.result && res.result.success) {
        wx.showToast({
          title: res.result.message || '操作成功',
          icon: 'success',
          duration: 2000
        });
        
        // 在刷新页面之前保存必要的数据，避免onShow导致数据丢失
        const mission = this.data.mission;
        const currentUser = this.data.currentUser; // 使用当前审核用户的真实名字
        const actionText = action === 'approve' ? '通过' : '驳回';
        
        // 获取云函数返回的打卡者openid - 关键修复：使用实际的打卡者openid
        const checkinUserId = res.result.checkinUserId;
        if (!checkinUserId) {
          console.error('云函数未返回checkinUserId，无法发送通知');
          // 仍需刷新页面
          this.onShow();
          return;
        }
        
        // 生成正确格式的发布时间（东八区）
        const publishTime = new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Shanghai'
        });
        
        // 先发送订阅消息给实际的打卡者
        try {
          const infoRes = await wx.cloud.callFunction({
            name: 'information',
            data: {
              templateId: 'RR5iJSiQGZcB-HFfqXCMvNdqsZdCU9wCsLXA-8KhaQc', // 使用审核结果模板ID
              auditResult: action === 'approve' ? '通过' : '驳回',
              auditTime: publishTime,
              auditor: currentUser || '系统', // 使用当前审核用户的真实名字
              taskName: mission.title,
              _id: this.data._id, // 传递任务ID，用于页面跳转
              _openid: checkinUserId // 关键修复：发送给实际的打卡者，而不是固定的任务接收者
            }
          });
          
          console.log('订阅消息发送结果:', infoRes);
          
          if (infoRes && infoRes.result) {
            if (infoRes.result.success) {
              console.log('订阅消息发送成功:', infoRes.result);
            } else {
              console.error('订阅消息发送失败:', infoRes.result.message, infoRes.result.error);
              // 显示通知发送失败的提示
              wx.showModal({
                title: '通知发送提示',
                content: `通知发送失败: ${infoRes.result.message || '未知错误'}`,
                showCancel: false
              });
            }
          } else {
            console.error('订阅消息返回结果异常:', infoRes);
          }
        } catch (err) {
          console.error('调用information云函数失败:', err);
          // 显示通知发送失败的提示
          wx.showModal({
            title: '通知发送提示',
            content: `调用通知服务失败: ${err.errMsg || '网络错误'}`,
            showCancel: false
          });
        }
        
        // 再刷新页面数据
        this.onShow();
        
        // 获取当前页面栈，用于通知上一页刷新
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2]; // 上一个页面是任务列表页
        
        // 延迟返回，确保用户看到成功提示
        setTimeout(() => {
          // 如果上一页存在，触发事件通知刷新
          if (prevPage) {
            // 支持多种刷新方法名，提高兼容性
            if (typeof prevPage.loadMissions === 'function') {
              prevPage.loadMissions();
            } else if (typeof prevPage.onShow === 'function') {
              prevPage.onShow();
            } else if (typeof prevPage.refresh === 'function') {
              prevPage.refresh();
            }
          }
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: res?.result?.message || '操作失败',
          icon: 'error',
          duration: 2000
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('审核失败:', error);
      wx.showToast({
        title: '审核失败',
        icon: 'error',
        duration: 2000
      });
    }
  },
  
  // 审核通过
  approveCheckin(e) {
    const recordIndex = e.currentTarget.dataset.index;
    this.auditCheckin(recordIndex, 'approve');
  },
  
  // 审核驳回
  rejectCheckin(e) {
    const recordIndex = e.currentTarget.dataset.index;
    this.auditCheckin(recordIndex, 'reject');
  },
  
  // 检查订阅消息授权状态
  checkSubscribeMessageAuth() {
    const templateId = '0ladc37q-fQoOMeGh7q2p-nPSAmrPyq2pT_3-roPCV0';
    
    wx.getSetting({
      withSubscriptions: true,
      success: (res) => {
        console.log('订阅消息授权状态:', res);
        if (res.subscriptionsSetting && res.subscriptionsSetting.itemSettings) {
          const itemSettings = res.subscriptionsSetting.itemSettings;
          if (itemSettings[templateId] === 'reject') {
            // 用户拒绝了授权，引导用户重新授权
            wx.showModal({
              title: '订阅消息',
              content: '需要您授权订阅消息才能及时接收任务通知，是否重新授权？',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 重新请求授权
                  this.checkAndRequestSubscribe();
                }
              }
            });
          }
        }
      },
      fail: (err) => {
        console.error('获取订阅消息授权状态失败:', err);
      }
    });
  },
  
  // 请求订阅消息授权
  requestSubscribeMessage() {
    // 同时请求两个模板的授权
    const templateIds = [
      '0ladc37q-fQoOMeGh7q2p-nPSAmrPyq2pT_3-roPCV0', // 任务创建和打卡通知模板
      'RR5iJSiQGZcB-HFfqXCMvNdqsZdCU9wCsLXA-8KhaQc'  // 审核结果通知模板
    ];
    
    wx.requestSubscribeMessage({
      tmplIds: templateIds,
      success: (res) => {
          console.log('用户授权结果:', res);
          
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
      },
      fail: (err) => {
          console.error('请求订阅消息授权失败:', err);
          
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
      },
    })
  },
  
  // 检查是否需要请求订阅消息授权
  checkAndRequestSubscribe() {
    // 每次都请求授权，确保新设备能够弹出授权弹窗
    console.log('请求订阅消息授权');
    this.requestSubscribeMessage();
  },
  
  // 下拉刷新处理函数
  onPullDownRefresh() {
    console.log('下拉刷新触发');
    // 调用onShow函数重新加载任务数据
    this.onShow().then(() => {
      // 停止下拉刷新动画
      wx.stopPullDownRefresh();
    }).catch(err => {
      console.error('下拉刷新失败:', err);
      // 即使加载失败，也要停止下拉刷新动画
      wx.stopPullDownRefresh();
    });
  }
})