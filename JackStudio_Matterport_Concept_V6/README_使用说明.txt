JACK STUDIO — IMMERSIVE WALKTHROUGH CONCEPT V5
============================================

这是根据提供的 Jack Studio 店面照片及手绘范围图，制作的可行走 3D 概念版。
不是视频、照片轮播，也不是 Matterport 导出的完整空间扫描。
没有使用外部 CDN，可在 Windows Chrome / Edge 中直接打开。

1. 如何启动
   - 请先解压完整 ZIP。
   - 打开 index.html。
   - 如果出现 WebGL 不支持，请在 Chrome/Edge 设置中开启硬件加速（Use graphics acceleration when available），重启浏览器再试。

2. 如何操作
   - 鼠标拖动 = 360° 转换视角（水平无限转动，俯仰有限制）
   - 点击地面 = 第一人称自动走往点击位置；会绕开中央展示台
   - W/A/S/D = 向前、左、后、右移动
   - ↑ ↓ 键 = 前进、后退；← → 键 = 转向
   - 点击右下角地图上的圆点 = 移动到相应货架
   - Walk around the store = 按设定路线自动绕完整店，3D 视角真正移动（不是视频播放）
   - View reference = 显示对应原始实拍照片
   - 手机可拖动画面、使用画面方向键和地图

3. 路线
   Entrance → Craft Innovative → Urban Carry → Professional →
   Travel Movement → Service Counter → Everyday Style →
   Craft Heritage → Essential → Entrance

4. 概念版限制
   - 店内布局及比例来自手绘草图，大致重建而非测量数据。
   - 黑色金属展示架、浅木纹、地板、货架照片与皮具几何共同形成 3D 场景。
   - 背板使用实际照片，未拍摄角度、货架厚度、产品立体形状为示意重建。
   - 与真实 Matterport 的摄影测量/空间扫描不同；暂不具有真实的全点位照片级重建。

5. 文件
   index.html       页面
   app.js           原生 WebGL 的 3D 场景与行走控制
   style.css        桌面和手机 UI
   assets/atlas-data.js  内嵌图片纹理（本地离线使用）
   assets/*.jpg     原始照片的缩放版，用于展示参考

未来如果需要正式上线，可进一步升级扫描建模、真实贴图、产品互动和 Admin 管理。
