Page({
  //保存正在编辑的商品
  data: {
    title: '',
    desc: '',
    
    credit: 0,
    maxCredit: getApp().globalData.maxCredit,
    presetIndex: 0,
    
    // 背景图片路径
    backgroundImage: '',
    // 隐藏背景图片
    hideBackground: true,
    
    presets: [{
        name:"无预设",
        title:"",
        desc:"",
    },{
        name:"奶茶券",
        title:"奶茶权限",
        desc:"凭此券可以向对方索要一杯奶茶。",
    },{
        name:"夜宵券",
        title:"夜宵放开闸",
        desc:"凭此券可以让自己在夜里狂野干饭。",
    },{
        name:"按摩券",
        title:"按摩券",
        desc:"凭此券可以让对方按摩一次！",
    },{
        name:"做家务",
        title:"家务券",
        desc:"凭此券可以让对方做一次轻型家务，比如扔垃圾，打扫一个的房间，领一天外卖什么的。",
    },{
        name:"不赖床",
        title:"早起券",
        desc:"凭此券可以让对方早起床一次。熬夜对身体很不好，还是要早点睡觉第二天才能有精神！",
    },{
        name:"做运动",
        title:"减肥券",
        desc:"凭此券可以逼迫对方做一次运动，以此来达到减肥维持健康的目的。",
    },{
        name:"给饭吃",
        title:"饭票",
        desc:"凭此券可以让对方做一次或请一次饭，具体视情况而定。",
    },{
        name:"买小礼物",
        title:"小礼物盒",
        desc:"凭此券可以让对方买点小礼物，像泡泡马特什么的。",
    },{
        name:"跑腿",
        title:"跑腿召唤",
        desc:"凭此券可以让对方跑腿一天，拿外卖，拿零食，开空调，开电视，在所不辞。",
    }],
    list: getApp().globalData.collectionMarketList,
    user: '',
    openid: 'none',
    another_openid: '',
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

  // 表单验证函数
  validateForm() {
    if (!this.data.title) {
      wx.showToast({
        title: '标题未填写',
        icon: 'error',
        duration: 2000
      });
      return false;
    }
    if (this.data.title.length > 12) {
      wx.showToast({
        title: '标题过长',
        icon: 'error',
        duration: 2000
      });
      return false;
    }
    if (this.data.desc.length > 100) {
      wx.showToast({
        title: '描述过长',
        icon: 'error',
        duration: 2000
      });
      return false;
    }
    if (this.data.credit <= 0) {
      wx.showToast({
        title: '一定要有积分',
        icon: 'error',
        duration: 2000
      });
      return false;
    }
    return true;
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
    // 确保积分是数字类型
    const credit = parseInt(e.detail.value) || 0;
    this.setData({
      credit: Math.max(0, Math.min(this.data.maxCredit, credit))
    })
  },
  
  // 点击滑块值，弹出输入框
  onSliderValueTap() {
    wx.showModal({
      title: '输入积分',
      editable: true,
      placeholderText: '输入积分',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          let inputValue = parseInt(res.content) || 0;
          // 限制积分范围在0-20之间
          inputValue = Math.max(0, Math.min(this.data.maxCredit, inputValue));
          this.setData({
            credit: inputValue
          });
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

  //保存商品
  async saveItem() {
    // 表单验证
    if (!this.validateForm()) {
      return;
    }
    
    try {
      // 验证用户身份
      await this.getUser();
      
      // 准备传递给云函数的数据，只传递必要字段
      const itemData = {
        title: this.data.title,
        desc: this.data.desc,
        credit: Number(this.data.credit),
        list: this.data.list
      };
      
      // 保存商品
      const result = await wx.cloud.callFunction({name: 'addElement', data: itemData});
      console.log('addElement 云函数返回结果:', result);
      
      // 只要云函数调用成功，就认为商品保存成功
      wx.showToast({
        title: '添加成功',
        icon: 'success',
        duration: 1000
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    } catch (error) {
      console.error('操作失败:', error);
      
      if (error.message === '用户未授权') {
        wx.showToast({
          title: '您不是授权用户，无法添加商品',
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
          title: '保存失败，请重试',
          icon: 'error',
          duration: 2000
        });
      }
    }
  },

  // 重置所有表单项
  resetItem() {
    this.setData({
      title: '',
      desc: '',
      credit: 0,
      presetIndex: 0,
      list: getApp().globalData.collectionMarketList,
    })
  },
  
  onShow() {
    this.setData({
      backgroundImage: getApp().globalData.backgroundImage
    })
  }
})