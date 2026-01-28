Page({
  data: {
      search: "",
      credit: 0,
      user: "",
      userType: '',
      currentOpenid: '',

      allItems: [],
      unusedItems: [],
      usedItems: [],
  
      slideButtons: [
          {extClass: 'useBtn', text: '使用', src: "Images/icon_use.svg"},
          {extClass: 'starBtn', text: '星标', src: "Images/icon_star.svg"},
          {extClass: 'removeBtn', text: '删除', src: 'Images/icon_del.svg'}
      ],
      
      // 背景图片路径
      backgroundImage: '',
  },

  //页面加载时运行
  async onShow(){
      try {
          // 设置背景图片路径
          this.setData({
            backgroundImage: getApp().globalData.backgroundImage
          });
          
          const app = getApp();
          // 使用全局认证方法验证用户身份
          const authInfo = await app.verifyUser();
          if (!authInfo.valid) {
              wx.showToast({
                  title: '您不是授权用户，无法访问仓库页面',
                  icon: 'none',
                  duration: 2000
              });
              return;
          }
          
          // 从认证结果中获取用户信息
          const currentOpenid = authInfo.openid;
          const user = authInfo.user;
          const userType = user === '然然' ? 'A' : 'B'; // 根据用户名字设置用户类型：然然对应A，小向对应B
          
          // 设置用户信息
          this.setData({
              user: user,
              userType: userType,
              currentOpenid: currentOpenid
          });
          
          // 获取用户积分
          const creditRes = await app.callFunction({name: 'getElementByOpenId', data: {
              list: app.globalData.collectionUserList,
              _openid: currentOpenid
          }});
          if(creditRes.result.data && creditRes.result.data.length > 0){
              this.setData({credit: creditRes.result.data[0].credit});
          }
          
          // 获取物品列表
          const itemsRes = await app.callFunction({name: 'getElementByOpenId', data: {
              list: app.globalData.collectionStorageList,
              _openid: currentOpenid
          }});
          this.setData({allItems: itemsRes.result.data || []});
          this.filterItem();
      } catch (error) {
          console.error('加载物品列表失败:', error);
          if (error.message === '用户未授权') {
              wx.showToast({
                  title: '您不是授权用户，无法访问仓库页面',
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

  //转到物品详情
  toDetailPage(element, isUpper) {
    const itemIndex = element.currentTarget.dataset.index
    const item = isUpper ? this.data.unusedItems[itemIndex] : this.data.usedItems[itemIndex]
    if (item) {
      wx.navigateTo({url: '../ItemDetail/index?id=' + item._id})
    } else {
      wx.showToast({
        title: '物品不存在',
        icon: 'error',
        duration: 2000
      })
    }
  },
  //转到物品详情[上]
  toDetailPageUpper(element) {
    this.toDetailPage(element, true)
  },  
  //转到物品详情[下]
  toDetailPageLower(element) {
    this.toDetailPage(element, false)
  },

  //设置搜索
  onSearch(element){
    this.setData({
      search: element.detail.value
    })

    this.filterItem()
  },

  //将物品划分为：完成，未完成
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

    itemList.forEach(item => {
      item.formattedDate = this.formatDate(item.date)
      // 格式化使用时间
      if (item.useTime) {
        item.formattedUseTime = this.formatDate(item.useTime)
      }
    })

    this.setData({
      unusedItems: itemList.filter(item => item.available === true),
      usedItems: itemList.filter(item => item.available === false),
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
      //得到UI序号
      const {index} = element.detail

      //根据序号获得物品
      const itemIndex = element.currentTarget.dataset.index
      const item = isUpper === true ? this.data.unusedItems[itemIndex] : this.data.usedItems[itemIndex]

      if (!item) {
        console.error('未找到物品数据');
        return;
      }

      const app = getApp();
      const currentOpenid = this.data.currentOpenid;

      //处理完成点击事件
      if (index === 0) {
          if(isUpper) {
              await this.useItem(element)
          }else{
              wx.showToast({
                  title: '物品已被使用',
                  icon: 'error',
                  duration: 2000
              })
          }
          
      }else if(item._openid === currentOpenid){
          //处理星标按钮点击事件
          if (index === 1) {
              await app.callFunction({name: 'editStar', data: {_id: item._id, list: app.globalData.collectionStorageList, value: !item.star}});
              //更新本地数据
              item.star = !item.star
              //触发显示更新
              this.setData({ unusedItems: this.data.unusedItems, usedItems: this.data.usedItems });
          }
          
          //处理删除按钮点击事件
          else if (index === 2) {
              await app.callFunction({name: 'deleteElement', data: {_id: item._id, list: app.globalData.collectionStorageList}});
              
              // 创建新的数组副本，避免直接修改data
              const newUnusedItems = this.data.unusedItems.slice();
              const newUsedItems = this.data.usedItems.slice();
              
              if(isUpper) {
                  newUnusedItems.splice(itemIndex, 1);
              } else {
                  newUsedItems.splice(itemIndex, 1);
              }
              
              //如果删除完所有事项，刷新数据，让页面显示无事项图片
              if (newUnusedItems.length === 0 && newUsedItems.length === 0) {
                  this.setData({
                      allItems: [],
                      unusedItems: [],
                      usedItems: []
                  });
              } else {
                  //触发显示更新
                  this.setData({ 
                      unusedItems: newUnusedItems, 
                      usedItems: newUsedItems 
                  });
              }
          }

      //如果编辑的不是自己的物品，显示提醒
      }else{
          wx.showToast({
          title: '只能编辑自己的物品',
          icon: 'error',
          duration: 2000
          })
      }
    } catch (error) {
      console.error('处理左划按钮事件失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  //使用物品
  async useItem(element) {
      try {
          //根据序号获得物品
          const itemIndex = element.currentTarget.dataset.index
          const item = this.data.unusedItems[itemIndex]

          if (!item) {
            console.error('未找到物品数据');
            return;
          }

          const app = getApp();
          //使用物品
          await app.callFunction({name: 'editAvailable', data: {_id: item._id, value: false, list: app.globalData.collectionStorageList}});
          //显示提示
          wx.showToast({
              title: '已使用',
              icon: 'success',
              duration: 2000
          })

          //触发显示更新
          item.available = false
          this.filterItem()
      } catch (error) {
          console.error('使用物品失败:', error);
          wx.showToast({
              title: '操作失败',
              icon: 'error',
              duration: 2000
          });
      }
  },
})