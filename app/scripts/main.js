
// 加载图像
loadWebp('./images/1.webp');

function loadWebp(url) {
  fetch(url)
    .then(data => data.arrayBuffer())
    .then(buffer => {
      let array = new Uint8Array(buffer);
      webPDecoder(array);
    })
}

function webPDecoder(array) {
  let decoder = new WebPDecoder();
  let imagearray = WebPRiffParser(array, 0);
  imagearray['response'] = array;
  imagearray['rgbaoutput'] = true;
  imagearray['dataurl'] = false;

  let header = imagearray['header'] ? imagearray['header'] : null;
  let frames = imagearray['frames'] ? imagearray['frames'] : [];
  let framesLength = frames.length || 0;

  let imgWidth;
  let imgHeight;
  let blend = false;
  // 获取图像大小
  if (header) {
    header['loop_counter'] = header['loop_count'];
    imgHeight = header['canvas_height'];
    imgWidth = header['canvas_width'];
    for (let f = 0; f < framesLength; f++) {
      if (frames[f]['blend'] == 0) {
        blend = true;
        break;
      }
    }
  }
  let pixelData;
  for (let f = 0; f < framesLength; f++) {
    let frame = frames[f];
    let height = [0];
    let width = [0];
    let rgba = decoder.WebPDecodeRGBA(array, frame['src_off'], frame['src_size'], width, height);
    frame['rgba'] = rgba;
    frame['imgwidth'] = width[0];
    frame['imgheight'] = height[0];
    if (!header) {
      imgHeight = height[0];
      imgWidth = width[0];
    } else {
      console.log('webp have header not support, need adapter it.', header)
      // debugger;
      // if(blend) {
      //   var oldimagedata;
      //   var oldimagedata=[];
      //   var oldimagedata_=ctx.getImageData(frame['offset_x'], frame['offset_y'],width[0], height[0]);
      //   for(var i=0;i<width[0]*height[0]*4;i++)
      //     oldimagedata[i]=oldimagedata_.data[i];
      // }
    }
    let byteLength = imgWidth * imgHeight * 4;
    // rgba to pixel data
    if ((framesLength == 1 && typeof frame['blend'] === 'undefined') || frame['blend']) {
      pixelData = [...rgba.slice(0, byteLength)];
    } else {
      console.log('webp format not support, need adapter it.')
      pixelData = new Uint8ClampedArray(byteLength)
      for (let i = 0; i < byteLength; i += 4) {
        if (rgba[i + 3] > 0) {
          pixelData[i] = rgba[i];
          pixelData[i + 1] = rgba[i + 1];
          pixelData[i + 2] = rgba[i + 2];
          pixelData[i + 3] = rgba[i + 3];
        } else {
          console.log('webp format not support, need adapter it.')
          // pixelData[i + 3] = oldimagedata[i + 3];
          // pixelData[i] = oldimagedata[i];
          // pixelData[i + 1] = oldimagedata[i + 1];
          // pixelData[i + 2] = oldimagedata[i + 2];
        }
      }
    }
    drawWebP(pixelData);
  }
}

function drawWebP(pixelData) {
  let canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');

  let pixels = new Uint8ClampedArray(pixelData);
  let imageData = new ImageData(pixels, 550, 368);
  ctx.putImageData(imageData, 0, 0);
}

function WebPRiffParser(src, src_off) {

  let imagearray = {};
  let i = 0;
  let alpha_chunk = false;
  let alpha_size = 0;
  let alpha_offset = 0;
  imagearray['frames'] = [];
  if (memcmp(src, src_off, 'RIFF', 4)) return;
  src_off += 4;
  let riff_size = GetLE32(src, src_off) + 8;
  src_off += 8;

  while (src_off < src.length) {
    var fourcc = GetTag(src, src_off);
    src_off += 4;

    var payload_size = GetLE32(src, src_off);
    src_off += 4;
    var payload_size_padded = payload_size + (payload_size & 1);

    switch (fourcc) {
      case 'VP8 ':
      case 'VP8L':
        if (typeof imagearray['frames'][i] === 'undefined') imagearray['frames'][i] = {};
        var obj = imagearray['frames'][i];
        var height = [0];
        var width = [0];
        obj['src_off'] = alpha_chunk ? alpha_offset : src_off - 8;
        obj['src_size'] = alpha_size + payload_size + 8;
        //var rgba = webpdecoder.WebPDecodeRGBA(src,(alpha_chunk?alpha_offset:src_off-8),alpha_size+payload_size+8,width,height);
        //imagearray[i]={'rgba':rgba,'width':width[0],'height':height[0]};
        i++;
        if (alpha_chunk) {
          alpha_chunk = false;
          alpha_size = 0;
          alpha_offset = 0;
        }
        break;
      case 'VP8X':
        var obj = imagearray['header'] = {};
        var feature_flags = obj['feature_flags'] = src[src_off];
        var src_off_ = src_off + 4;
        var canvas_width = obj['canvas_width'] = 1 + GetLE24(src, src_off_);
        src_off_ += 3;
        var canvas_height = obj['canvas_height'] = 1 + GetLE24(src, src_off_);
        src_off_ += 3;
        break;
      case 'ALPH':
        alpha_chunk = true;
        alpha_size = payload_size_padded + 8;
        alpha_offset = src_off - 8;
        break;

      case 'ANIM':
        var obj = imagearray['header'];
        var bgcolor = obj['bgcolor'] = GetLE32(src, src_off);
        src_off_ = src_off + 4;

        var loop_count = obj['loop_count'] = GetLE16(src, src_off_);
        src_off_ += 2;
        break;
      case 'ANMF':
        var offset_x = 0, offset_y = 0, width = 0, height = 0, duration = 0, blend = 0, dispose = 0, temp = 0;
        var obj = imagearray['frames'][i] = {};
        obj['offset_x'] = offset_x = 2 * GetLE24(src, src_off);
        src_off += 3;
        obj['offset_y'] = offset_y = 2 * GetLE24(src, src_off);
        src_off += 3;
        obj['width'] = width = 1 + GetLE24(src, src_off);
        src_off += 3;
        obj['height'] = height = 1 + GetLE24(src, src_off);
        src_off += 3;
        obj['duration'] = duration = GetLE24(src, src_off);
        src_off += 3;
        temp = src[src_off++];
        obj['dispose'] = dispose = temp & 1;
        obj['blend'] = blend = (temp >> 1) & 1;
        break;
      default:
    }
    if (fourcc != 'ANMF')
      src_off += payload_size_padded;
  }
  return imagearray;
}

function memcmp(data, data_off, str, size) {
  for (var i = 0; i < size; i++)
    if (data[data_off + i] != str.charCodeAt(i))
      return true;
  return false;
}

function GetTag(data, data_off) {
  var str = '';
  for (var i = 0; i < 4; i++)
    str += String.fromCharCode(data[data_off++]);
  return str;
}

function GetLE16(data, data_off) {
  return (data[data_off + 0] << 0) | (data[data_off + 1] << 8);
}

function GetLE24(data, data_off) {
  return ((data[data_off + 0] << 0) | (data[data_off + 1] << 8) | (data[data_off + 2] << 16)) >>> 0;
}

function GetLE32(data, data_off) {
  return ((data[data_off + 0] << 0) | (data[data_off + 1] << 8) | (data[data_off + 2] << 16) | (data[data_off + 3] << 24)) >>> 0;
}
