Page({
  data: {
    screenWidth: 1000,
    screenHeight: 1000,

    search: "",
    credit: 0,
    user: "",
    currentOpenid: '', // 当前用户的openid

    allItems: [], //所有商品
    unboughtItems: [], //上架商品
    boughtItems: [], //下架商品

    // 背景图片路径
    backgroundImage: '',
  },

  // 验证用户身份
  async verifyUser() {
    const app = getApp();
    const authInfo = await app.verifyUser();
    
    console.log('用户验证结果:', authInfo);
    
    if(authInfo.valid){
      this.setData({
          user: authInfo.user,
          currentOpenid: authInfo.openid,
          another_openid: authInfo.another_openid,
          userType: authInfo.user === '然然' ? 'A' : 'B' // 根据用户名字设置用户类型：然然对应A，小向对应B
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
      // 设置背景图片路径
      this.setData({
        backgroundImage: getApp().globalData.backgroundImage
      });
      
      // 验证用户身份
      await this.verifyUser();
      
      // 获取当前账号积分数额
      await this.getCurrentCredit();
      
      // 获取商品列表
      const app = getApp();
      const data = await app.callFunction({name: 'getList', data: {list: app.globalData.collectionMarketList}});
      if (data && data.result && data.result.data) {
        this.setData({allItems: data.result.data});
      } else {
        console.error('获取商品列表失败:', data);
        this.setData({allItems: []});
      }
      this.filterItem();
      this.getScreenSize();
    } catch (error) {
      console.error('页面加载失败:', error);
      if (error.message === '用户未授权') {
        wx.showToast({
          title: '您不是授权用户，无法访问商城页面',
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

  //获取当前账号积分数额
  async getCurrentCredit(){
    try {
      const app = getApp();
      const openid = this.data.currentOpenid; // 使用已保存的currentOpenid
      
      if (!openid) {
        console.error('获取当前账号积分数额失败：缺少openid');
        return;
      }
      
      const res = await app.callFunction({name: 'getElementByOpenId', data: {list: app.globalData.collectionUserList, _openid: openid}});
      
      if (res && res.result && res.result.data && res.result.data.length > 0) {
        this.setData({
          credit: res.result.data[0].credit
        });
      } else {
        console.error('获取当前账号积分数额失败:', res);
        this.setData({credit: 0});
      }
    } catch (error) {
      console.error('获取当前账号积分数额失败:', error);
      this.setData({credit: 0});
    }
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

  //转到商品详情
  toDetailPage(element, isUpper) {
    const itemIndex = element.currentTarget.dataset.index
    const item = isUpper ? this.data.unboughtItems[itemIndex] : this.data.boughtItems[itemIndex]
    wx.navigateTo({url: '../MarketDetail/index?id=' + item._id})
  },
  //转到商品详情[上]
  toDetailPageUpper(element) {
    this.toDetailPage(element, true)
  },  
  //转到商品详情[下]
  toDetailPageLower(element) {
    this.toDetailPage(element, false)
  },
  //转到添加商品
  toAddPage() {
    wx.navigateTo({url: '../MarketAdd/index'})
  },

  //设置搜索
  onSearch(element){
    this.setData({
      search: element.detail.value
    })

    this.filterItem()
  },

  //将商品划分为：完成，未完成
  filterItem(){
    let itemList = []
    if(this.data.search != ""){
      for(let i in this.data.allItems){
        if(this.data.allItems[i].title.match(this.data.search) != null){
          itemList.push(this.data.allItems[i])
        }
      }
    }else{
      itemList = this.data.allItems
    }

    const currentUserName = this.data.user;
    itemList.forEach(item => {
      item.formattedDate = this.formatDate(item.date);
      // 添加商品创建者标识和图标类型
      const isCreatorCurrentUser = item._openid === this.data.currentOpenid;
      
      // 设置isCurrentUser属性，用于slideButtons生成
      item.isCurrentUser = isCreatorCurrentUser;
      
      // 根据当前用户身份和商品创建者来设置图标类型
      if (currentUserName) {
        if (currentUserName === '然然') {
          item.iconType = isCreatorCurrentUser ? 'A' : 'B';
        } else if (currentUserName === '小向') {
          item.iconType = isCreatorCurrentUser ? 'B' : 'A';
        }
      }
      
      // 为每个商品动态生成slideButtons
      // 如果是自己发布的商品，不显示购买按钮
      if (item.isCurrentUser) {
        // 自己的商品：只显示星标和删除按钮
        item.slideButtons = [
          {extClass: 'starBtn', text: '星标', src: "Images/icon_star.svg"},
          {extClass: 'removeBtn', text: '删除', src: 'Images/icon_del.svg'}
        ]
      } else {
        // 别人的商品：显示购买、星标和删除按钮
        item.slideButtons = [
          {extClass: 'buyBtn', text: '购买', src: "Images/icon_buy.svg"},
          {extClass: 'starBtn', text: '星标', src: "Images/icon_star.svg"},
          {extClass: 'removeBtn', text: '删除', src: 'Images/icon_del.svg'}
        ]
      }
    })

    this.setData({
      unboughtItems: itemList.filter(item => item.available === true),
      boughtItems: itemList.filter(item => item.available === false),
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

  //响应左划按钮事件[上]
  slideButtonTapUpper(element) {
    this.slideButtonTap(element, true)
  },

  //响应左划按钮事件[下]
  slideButtonTapLower(element) {
    this.slideButtonTap(element, false)
  },

  //响应左划按钮事件逻辑
  async slideButtonTap(element, isUpper){
    try {
      //得到UI序号和按钮信息
      const index = element.detail.index

      //根据序号获得商品
      const itemIndex = element.currentTarget.dataset.index
      const item = isUpper === true ? this.data.unboughtItems[itemIndex] : this.data.boughtItems[itemIndex]
      
      if (!item) {
        console.error('未找到商品数据');
        return;
      }
      
      // 获取被点击的按钮信息
      const button = item.slideButtons[index]
      
      if (!button) {
        console.error('未找到按钮信息');
        return;
      }

      // 获取当前用户openid
      const currentOpenid = this.data.currentOpenid;
      
      // 处理购买按钮点击事件
      if (button.text === '购买' || button.extClass === 'buyBtn') {
          if(isUpper) {
              this.buyItem(element)
          }else{
              wx.showToast({
                  title: '物品已被购买',
                  icon: 'error',
                  duration: 2000
              })
          }
          
      // 处理星标按钮点击事件
      } else if ((button.text === '星标' || button.extClass === 'starBtn') && item._openid === currentOpenid) {
          const app = getApp();
          const res = await wx.cloud.callFunction({name: 'editStar', data: {_id: item._id, list: app.globalData.collectionMarketList, value: !item.star}});
          if (res) {
              //更新本地数据
              item.star = !item.star
              //触发显示更新
              this.setData({boughtItems: this.data.boughtItems, unboughtItems: this.data.unboughtItems});
          } else {
              wx.showToast({
                  title: '操作失败，请重试',
                  icon: 'error',
                  duration: 2000
              });
          }
          
      //处理删除按钮点击事件
      } else if ((button.text === '删除' || button.extClass === 'removeBtn') && item._openid === currentOpenid) {
          const app = getApp();
          const res = await wx.cloud.callFunction({name: 'deleteElement', data: {_id: item._id, list: app.globalData.collectionMarketList}});
          if (res) {
              //更新本地数据
              if(isUpper) this.data.unboughtItems.splice(itemIndex, 1) 
              else  this.data.boughtItems.splice(itemIndex, 1) 
              //如果删除完所有事项，刷新数据，让页面显示无事项图片
              if (this.data.unboughtItems.length === 0 && this.data.boughtItems.length === 0) {
                  this.setData({
                  allItems: [],
                  unboughtItems: [],
                  boughtItems: []
                  });
              } else {
                  //触发显示更新
                  this.setData({boughtItems: this.data.boughtItems, unboughtItems: this.data.unboughtItems});
              }
          } else {
              wx.showToast({
                  title: '操作失败，请重试',
                  icon: 'error',
                  duration: 2000
              });
          }

      //如果编辑的不是自己的商品，显示提醒
      }else if(item._openid !== currentOpenid){
          wx.showToast({
          title: '只能编辑自己的商品',
          icon: 'error',
          duration: 2000
          });
      }
    } catch (error) {
      console.error('处理按钮点击事件失败:', error);
      wx.showToast({
          title: '操作失败，请重试',
          icon: 'error',
          duration: 2000
      });
    }
  },

  //购买商品
  async buyItem(element) {
    //根据序号获得商品
    const itemIndex = element.currentTarget.dataset.index
    const item = this.data.unboughtItems[itemIndex]
    
    if (!item) {
      console.error('未找到商品数据');
      wx.showToast({
        title: '商品不存在',
        icon: 'error',
        duration: 2000
      });
      return;
    }
    
    // 检查积分是否足够，先显示加载提示
    wx.showLoading({
      title: '购买中...',
      mask: true
    });

    try {
      // 使用已保存的currentOpenid，避免重复调用getOpenId
      const openid = this.data.currentOpenid;
      
      if (!openid) {
        wx.hideLoading();
        wx.showToast({
          title: '用户未登录',
          icon: 'error',
          duration: 2000
        });
        return;
      }
      
      //如果购买自己的物品，显示提醒
      if(item._openid === openid){
        wx.hideLoading();
        wx.showToast({
          title: '不能购买自己的物品',
          icon: 'error',
          duration: 2000
        });
        return;
      }
      
      //如果没有积分，显示提醒
      if(this.data.credit < item.credit){
        wx.hideLoading();
        wx.showToast({
          title: '积分不足...',
          icon: 'error',
          duration: 2000
        });
        return;
      }
      
      const app = getApp();
      
      // 并行执行云函数调用，减少总等待时间
      const results = await Promise.all([
        wx.cloud.callFunction({name: 'editAvailable', data: {_id: item._id, value: false, list: app.globalData.collectionMarketList}}),
        wx.cloud.callFunction({name: 'editCredit', data: {_openid: openid, value: -item.credit, list: app.globalData.collectionUserList}}),
        wx.cloud.callFunction({name: 'addElement', data: {
            list: app.globalData.collectionStorageList,
            credit: item.credit,
            title: item.title,
            desc: item.desc,
        }})
      ]);
      
      // 隐藏加载提示
      wx.hideLoading();
      
      // 检查所有云函数调用是否成功
      const allSuccess = results.every(res => res);
      
      if (allSuccess) {
        //显示购买成功提示
        wx.showToast({
            title: '购买成功',
            icon: 'success',
            duration: 2000
        });

        // 并行执行刷新操作
        await Promise.all([
          this.getCurrentCredit(),
          // 更新本地数据，避免重复调用API
          new Promise(resolve => {
            // 更新本地商品状态
            item.available = false;
            // 重新过滤商品列表
            this.filterItem();
            resolve();
          })
        ]);
      } else {
        wx.showToast({
          title: '购买失败，请重试',
          icon: 'error',
          duration: 2000
        });
      }
    } catch (error) {
      // 隐藏加载提示
      wx.hideLoading();
      console.error('购买商品失败:', error);
      if (error.message.includes('云开发') || error.message.includes('网络')) {
        wx.showToast({
          title: '网络错误，请检查网络连接',
          icon: 'none',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: '购买失败，请重试',
          icon: 'error',
          duration: 2000
        });
      }
    }
  },
})