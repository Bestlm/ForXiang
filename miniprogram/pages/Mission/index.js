Page({
  data: {
    screenWidth: 1000,
    screenHeight: 1000,

    search: "",

    allMissions: [],
    unfinishedMissions: [],
    finishedMissions: [],



    todayStr: '',
    currentOpenId: '',
    
    // 背景图片路径
    backgroundImage: '',
    
    // 刷新相关
    refreshTimer: null,
    refreshInterval: 10000, // 10秒自动刷新一次
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

  //页面加载时运行
  async onShow(){
    try {
      // 获取当前日期
      const today = new Date()
      this.setData({
        todayStr: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
        // 设置背景图片路径
        backgroundImage: getApp().globalData.backgroundImage
      })
      
      // 验证用户身份
      await this.verifyUser();
      
      // 加载任务数据
      await this.loadMissions();
      
      // 为所有用户添加低频率刷新，确保及时看到任务状态变化
      // 包括：待审核记录、打卡状态变更（通过/驳回）等
      // 只有当有未完成任务时才启动
      if (this.data.unfinishedMissions.length > 0) {
        this.startPendingRefresh();
      }
    } catch (error) {
      console.error('加载任务数据失败:', error);
      if (error.message === '用户未授权') {
        wx.showToast({
          title: '您不是授权用户，无法访问任务页面',
          icon: 'none',
          duration: 2000
        });
      } else if (error.message.includes('云开发') || error.message.includes('网络')) {
        wx.showToast({
          title: '网络错误，请检查网络连接',
          icon: 'none',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'error',
          duration: 2000
        });
      }
    }
  },
  
  // 加载任务数据
  async loadMissions() {
    try {
      // 获取任务列表
      const app = getApp();
      const missionsRes = await app.callFunction({name: 'getList', data: {list: app.globalData.collectionMissionList}});
      if (!missionsRes || !missionsRes.result || !missionsRes.result.data) {
        console.error('获取任务列表失败:', missionsRes);
        this.setData({allMissions: []});
        this.filterMission();
        return;
      }
      let allMissions = missionsRes.result.data;
      console.log('所有任务数据:', allMissions);
      
      // 处理任务数据，为每个任务添加hasPendingRecords属性
      allMissions = allMissions.map(mission => {
        let hasPendingRecords = false;
        
        // 检查长期任务的dailyRecords
        if (mission.isLongTerm && mission.dailyRecords) {
          hasPendingRecords = mission.dailyRecords.some(r => r.status === 'pending');
        }
        // 检查普通任务的checkinRecords
        else if (mission.checkinRecords) {
          hasPendingRecords = mission.checkinRecords.some(r => r.status === 'pending');
        }
        
        // 不使用扩展运算符，避免Babel依赖问题
        // 创建一个新对象，复制mission的所有属性
        const newMission = Object.assign({}, mission);
        newMission.hasPendingRecords = hasPendingRecords;
        return newMission;
      });
      
      // 过滤出长期任务并打印
      const longTermMissions = allMissions.filter(mission => mission.isLongTerm);
      console.log('长期任务:', longTermMissions);
      
      this.setData({allMissions: allMissions});
      this.filterMission();
      this.getScreenSize();
    } catch (error) {
      console.error('加载任务数据失败:', error);
    }
  },
  
  // 启动待审核记录的低频率刷新
  startPendingRefresh() {
    // 先清除之前的定时器
    this.stopPendingRefresh();
    
    // 启动新的定时器，30秒刷新一次，只用于检查待审核记录
    this.data.refreshTimer = setInterval(() => {
      console.log('检查待审核记录');
      this.loadMissions();
    }, 30000); // 30秒刷新一次，比原来的10秒更长，减少请求频率
  },
  
  // 停止待审核记录的刷新
  stopPendingRefresh() {
    if (this.data.refreshTimer) {
      clearInterval(this.data.refreshTimer);
      this.data.refreshTimer = null;
    }
  },
  
  // 页面隐藏时停止刷新
  onHide() {
    this.stopPendingRefresh();
  },
  
  // 页面卸载时停止刷新
  onUnload() {
    this.stopPendingRefresh();
  },
  
  // 下拉刷新处理
  async onPullDownRefresh() {
    console.log('用户下拉刷新任务列表');
    await this.loadMissions();
    // 停止下拉刷新动画
    const app = getApp();
    app.stopPullDownRefresh();
  },

  //获取页面大小
  getScreenSize(){
    wx.getWindowInfo({
      success: (res) => {
        this.setData({
          screenWidth: res.windowWidth,
          screenHeight: res.windowHeight
        })
      }
    })
  },

  //转到任务详情
  toDetailPage(element, isUpper) {
    const missionIndex = element.currentTarget.dataset.index
    const mission = isUpper ? this.data.unfinishedMissions[missionIndex] : this.data.finishedMissions[missionIndex]
    
    // 导航到详情页，并设置返回时的回调
    wx.navigateTo({
      url: '../MissionDetail/index?id=' + mission._id,
      events: {
        // 监听详情页返回事件，强制刷新任务列表
        onPageBack: () => {
          console.log('从详情页返回，刷新任务列表');
          this.loadMissions();
        }
      }
    })
  },
  //转到任务详情[上]
  toDetailPageUpper(element) {
    this.toDetailPage(element, true)
  },  
  //转到任务详情[下]
  toDetailPageLower(element) {
    this.toDetailPage(element, false)
  },
  //转到添加任务
  toAddPage() {
    wx.navigateTo({url: '../MissionAdd/index'})
  },

  //设置搜索
  onSearch(element){
    this.setData({
      search: element.detail.value
    })

    this.filterMission()
  },

  //将任务划分为：完成，未完成
  filterMission(){
    let missionList = []
    if(this.data.search != ""){
      for(let i in this.data.allMissions){
        if(this.data.allMissions[i].title.match(this.data.search) != null){
          missionList.push(this.data.allMissions[i])
        }
      }
    }else{
      missionList = this.data.allMissions
    }

    const authInfo = getApp().globalData.authInfo;
    missionList.forEach(mission => {
      mission.formattedDate = this.formatDate(mission.date);
      // 添加任务创建者标识 - 修复：根据任务创建者的openid和当前用户身份来确定显示哪个图标
      if (authInfo && authInfo.openid) {
        // 确定当前用户是"然然"还是"小向"
        const currentUserName = authInfo.user;
        // 确定任务创建者是当前用户还是另一个用户
        const isCreatorCurrentUser = mission._openid === authInfo.openid;
        
        // 根据当前用户身份和任务创建者来设置图标类型
        // 如果当前用户是"然然"：
        //   - 任务是自己创建的 → 显示MissionA.png
        //   - 任务是别人创建的 → 显示MissionB.png
        // 如果当前用户是"小向"：
        //   - 任务是自己创建的 → 显示MissionB.png
        //   - 任务是别人创建的 → 显示MissionA.png
        if (currentUserName === '然然') {
          mission.iconType = isCreatorCurrentUser ? 'A' : 'B';
        } else if (currentUserName === '小向') {
          mission.iconType = isCreatorCurrentUser ? 'B' : 'A';
        }
      }
    })

    this.setData({
      unfinishedMissions: missionList.filter(item => item.available === true),
      finishedMissions: missionList.filter(item => item.available === false),
    })
  },

  formatDate(dateStr){
    if(!dateStr) return ''
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
  },

  // 获取今日打卡/完成记录的状态
  getTodayCheckinStatus(mission) {
    if (mission.isLongTerm) {
      // 长期任务处理
      if (!mission.dailyRecords) {
        return '';
      }
      const todayRecord = mission.dailyRecords.find(record => record.date === this.data.todayStr);
      if (!todayRecord) {
        return '';
      }
      return todayRecord.status || 'approved'; // 旧记录默认已完成
    } else {
      // 普通任务处理
      if (!mission.checkinRecords || mission.checkinRecords.length === 0) {
        return '';
      }
      // 普通任务只需要看最新的记录
      const latestRecord = mission.checkinRecords[mission.checkinRecords.length - 1];
      return latestRecord.status || '';
    }
  },

  // 判断是否允许打卡/完成
  canCheckinToday(mission) {
    if (!mission.available) {
      return false; // 任务已完成
    }
    
    const status = this.getTodayCheckinStatus(mission);
    // 只有已驳回或没有记录时才能操作
    return status === 'rejected' || status === '';
  },

  async checkInMission(element){
    const missionIndex = element.currentTarget.dataset.index
    const mission = this.data.unfinishedMissions[missionIndex]

    // 移除对isLongTerm的限制，允许普通任务也使用审核机制

    if(!this.canCheckinToday(mission)){
      const status = this.getTodayCheckinStatus(mission);
      let message = '今日已打卡';
      if(status === 'pending'){
        message = '打卡申请已提交，等待审核';
      }
      wx.showToast({
        title: message,
        icon: 'error',
        duration: 2000
      })
      return
    }

    try {
      const openid = this.data.currentOpenId;
      const app = getApp();
      
      if(mission._openid === openid){
        wx.showToast({
          title: '不能打卡自己的任务',
          icon: 'error',
          duration: 2000
        })
        return
      }

      // 获取当前用户的真实用户名
      const currentUserNickname = this.data.user || '用户';

      const res = await wx.cloud.callFunction({
        name: 'recordDailyCheck',
        data: {
          _id: mission._id,
          list: getApp().globalData.collectionMissionList,
          _openid: openid,
          checkinUserNickname: currentUserNickname // 传递真实用户名给云函数
        }
      });
      
      if(res.result.success){
        // 显示打卡申请提交成功提示
        wx.showToast({
          title: res.result.message,
          icon: 'success',
          duration: 2000
        })
        
        // 重新加载任务数据，而不是直接修改本地状态
        // 因为只有审核通过后，completedDays才会真正增加
        await this.loadMissions();
        
        // 不需要立即刷新积分，因为审核通过后才会发放积分
      }else{
        wx.showToast({
          title: res.result.message,
          icon: 'error',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('打卡失败:', error);
      wx.showToast({
        title: '打卡失败',
        icon: 'error',
        duration: 2000
      })
    }
  },

  //响应左划按钮事件[上]
  async slideButtonTapUpper(element) {
    this.slideButtonTap(element, true)
  },

  //响应左划按钮事件[下]
  async slideButtonTapLower(element) {
    this.slideButtonTap(element, false)
  },

  //响应左划按钮事件逻辑
  async slideButtonTap(element, isUpper){
    //得到UI序号，不使用对象解构赋值，避免Babel依赖问题
    const index = element.detail.index

    //根据序号获得任务
    const missionIndex = element.currentTarget.dataset.index
    const mission = isUpper === true ? this.data.unfinishedMissions[missionIndex] : this.data.finishedMissions[missionIndex]

    try {
        // 获取当前用户openid
        const currentOpenId = this.data.currentOpenId;
        
        // 确定按钮类型：根据动态生成的按钮数组结构
        // 对于非自己发布的未完成任务：[完成按钮, 星标按钮, 删除按钮]
        // 对于自己发布的任务或已完成任务：[星标按钮, 删除按钮]
        
        // 检查是否是完成按钮（只有非自己发布的未完成任务才有此按钮）
        if (currentOpenId !== mission._openid && isUpper && index === 0) {
            this.finishMission(element)
        } 
        // 处理收藏按钮点击事件（所有用户都可以操作）
        else if (index === 1 || (currentOpenId === mission._openid && index === 0)) {
            // 确定收藏按钮的索引：如果有完成按钮则是1，否则是0
            const isStarButton = (currentOpenId !== mission._openid && isUpper) ? (index === 1) : (index === 0);
            
            if (isStarButton) {
                await wx.cloud.callFunction({name: 'editStar', data: {_id: mission._id, list: getApp().globalData.collectionMissionList, value: !mission.star}});
                
                // 创建新的数组副本，避免直接修改data
                const newUnfinishedMissions = this.data.unfinishedMissions.slice();
                const newFinishedMissions = this.data.finishedMissions.slice();
                
                // 更新对应数组中的任务
                if (isUpper) {
                    newUnfinishedMissions[missionIndex].star = !newUnfinishedMissions[missionIndex].star;
                } else {
                    newFinishedMissions[missionIndex].star = !newFinishedMissions[missionIndex].star;
                }
                
                //触发显示更新
                this.setData({ 
                    finishedMissions: newFinishedMissions, 
                    unfinishedMissions: newUnfinishedMissions 
                });
            }
            //处理删除按钮点击事件（只有任务发布者可以操作）
            else if (mission._openid === currentOpenId && (index === 2 || (currentOpenId === mission._openid && index === 1))) {
                await wx.cloud.callFunction({name: 'deleteElement', data: {_id: mission._id, list: getApp().globalData.collectionMissionList}});
                
                // 创建新的数组副本，避免直接修改data
                const newUnfinishedMissions = this.data.unfinishedMissions.slice();
                const newFinishedMissions = this.data.finishedMissions.slice();
                
                if(isUpper) {
                    newUnfinishedMissions.splice(missionIndex, 1);
                } else {
                    newFinishedMissions.splice(missionIndex, 1);
                }
                
                //如果删除完所有事项，刷新数据，让页面显示无事项图片
                if (newUnfinishedMissions.length === 0 && newFinishedMissions.length === 0) {
                    this.setData({
                        allMissions: [],
                        unfinishedMissions: [],
                        finishedMissions: []
                    });
                } else {
                    //触发显示更新
                    this.setData({ 
                        finishedMissions: newFinishedMissions, 
                        unfinishedMissions: newUnfinishedMissions 
                    });
                }
            }
            //如果编辑的不是自己的任务且不是收藏操作，显示提醒
            else if (mission._openid !== currentOpenId) {
            wx.showToast({
            title: '只能编辑自己的任务',
            icon: 'error',
            duration: 2000
            })
        }
        }
    } catch (error) {
        console.error('处理左划按钮事件失败:', error);
        wx.showToast({
            title: '操作失败，请重试',
            icon: 'error',
            duration: 2000
        });
    }
  },

  //完成任务
  async finishMission(element) {
    //根据序号获得触发切换事件的待办
    const missionIndex = element.currentTarget.dataset.index
    const mission = this.data.unfinishedMissions[missionIndex]

    try {
      const currentOpenId = this.data.currentOpenId;
      
      if(mission._openid != currentOpenId){
        // 获取当前用户的真实用户名
        const currentUserNickname = this.data.user || '用户';

        // 通过recordDailyCheck云函数创建打卡记录，进入审核流程
        const res = await wx.cloud.callFunction({
          name: 'recordDailyCheck',
          data: {
            _id: mission._id,
            list: getApp().globalData.collectionMissionList,
            _openid: currentOpenId,
            checkinUserNickname: currentUserNickname
          }
        });
        
        if(res.result.success){
          // 显示打卡申请提交成功提示
          wx.showToast({
            title: res.result.message,
            icon: 'success',
            duration: 2000
          });
          
          // 重新加载任务数据
          await this.loadMissions();
        }else{
          wx.showToast({
            title: res.result.message || '操作失败',
            icon: 'error',
            duration: 2000
          });
        }

      }else{
        wx.showToast({
          title: '不能完成自己的任务',
          icon: 'error',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('完成任务失败:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'error',
        duration: 2000
      });
    }
  },
})