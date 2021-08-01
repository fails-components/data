/*
    Fails Components (Fancy Automated Internet Lecture System - Components)
    Copyright (C)  2015-2017 (original FAILS), 
                   2021- (FAILS Components)  Marten Richter <marten.richter@freenet.de>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import Color from 'color'

let now

// adds support for high performance timers + fallbacks taken from http://gent.ilcore.com/2012/06/better-timer-for-javascript.html
if (typeof window !== 'undefined') {
  window.performance = window.performance || {}

  // eslint-disable-next-line no-undef
  if (performance.now)
    now = () => {
      // eslint-disable-next-line no-undef
      return performance.now()
    }
  else
    now = () => {
      return new Date().getTime()
    }
} else {
  // we are running under node
  const { performance } = require('perf_hooks')
  now = function () {
    return performance.now()
  }
}

export class Sink {
  startPath(time, objnum, curclient, x, y, type, color, width, pressure) {
    // do nothing in base class
  }

  addToPath(time, objnum, curclient, x, y, pressure) {
    // do nothing in base class
  }

  finishPath(time, objnum, curclient) {
    // do nothing in base class
  }

  scrollBoard(time, x, y) {
    // do nothing in base class
  }

  addPicture(time, objnum, curclient, x, y, width, height, uuid) {
    // do nothing in base class
  }
}

// this object determines the area covered with drawings
// it is used for finding the best position for a pagebreak in a pdf
export class DrawArea extends Sink {
  constructor() {
    super()
    this.newmin = 0
    this.newmax = 0
    this.curw = 0
    this.glomin = 0
    this.glomax = 0
    this.intervals = []
  }

  startPath(time, objnum, curclient, x, y, type, color, w, pressure) {
    let intw = w
    if (pressure) intw *= pressure * 2
    this.newmin = this.newmax = y
    this.newmin -= intw
    this.newmax += intw
    this.curw = w
  }

  addToPath(time, objnum, curclient, x, y, pressure) {
    let intw = this.curw
    if (pressure) intw *= pressure * 2
    this.newmin = Math.min(y - intw, this.newmin)
    this.newmax = Math.max(y + intw, this.newmax)
  }

  finishPath(time, objnum, curclient) {
    this.commitInterval(this.newmin, this.newmax)
  }

  scrollBoard(time, x, y) {
    // do ... nothing....
  }

  addPicture(time, objnum, curclient, x, y, width, height, uuid) {
    this.commitInterval(y, y + height)
  }

  commitInterval(min, max) {
    const arr = this.intervals
    const length = arr.length
    let imin = 0
    // var imininside=false;
    let imax = 0
    // var imaxinside=false;
    this.glomin = Math.min(this.glomin, min)
    this.glomax = Math.max(this.glomax, max)

    let fmin = min
    let fmax = max

    for (imin = 0; imin < length; imin++) {
      const cur = arr[imin]
      if (cur.max > min && min > cur.min) {
        // imininside=true;
        fmin = cur.min
        // console.log("cI min1",min,cur.min,cur.max,imin);
        break
      } else if (cur.min > min) {
        // console.log("cI min2",min,cur.min,cur.max,imin);
        // imininside=false;
        fmin = min
        break
      }
    }

    for (imax = imin; imax < length; imax++) {
      const cur = arr[imax]
      if (cur.max > max && max > cur.min) {
        // console.log("cI max1",max,cur.min,cur.max,imax);
        // imaxinside=true;
        fmax = cur.max
        imax++
        break
      } else if (cur.min > max) {
        // console.log("cI max2",max,cur.min,cur.max,imax);
        // imininside=false;
        fmax = max
        break
      }
    }

    // console.log("cI length",imin,imax-imin,fmin,fmax,length);
    arr.splice(imin, imax - imin, { min: fmin, max: fmax })
  }

  findPagebreak(pagemin, pagemax) {
    const arr = this.intervals
    const length = arr.length

    // first find pagemax in interval array
    let index = 0
    let startmax = pagemax
    let found = false
    for (index = 0; index < length; index++) {
      const cur = arr[index]
      if (cur.min < pagemax && pagemax < cur.max) {
        startmax = cur.min
        found = true
        break
      } else if (pagemax < cur.min) {
        startmax = cur.min
        found = true
        break
      }
    }
    if (startmax < pagemin) return pagemax // no suitable whitespace!
    let lastquality = -1
    let selpagebreak = pagemax
    if (found)
      for (; index >= 0; index--) {
        const ncur = arr[index]
        if (startmax < ncur.max) continue // stupid!

        const pagebreak = Math.max(startmax - 0.04, (ncur.max + startmax) * 0.5)
        // console.log("pb",startmax,ncur.max);

        const quality =
          (0.1 * 0.1) /
            ((pagemax - pagebreak) * (pagemax - pagebreak) + 0.005) +
          Math.min((startmax - ncur.max) * (startmax - ncur.max), 0.04 * 0.04) /
            (0.04 * 0.04)
        // console.log("qs",pagebreak,quality,lastquality);
        if (quality > lastquality) {
          selpagebreak = pagebreak
          lastquality = quality
        }
        startmax = ncur.min
        if (ncur.max < pagemin) break
      }

    return selpagebreak
  }
}

// this object determines the area covered with drawings, New Implementation
// it is used for finding the best position for a pagebreak in a pdf
export class DrawArea2 extends Sink {
  constructor() {
    super()
    this.numslicesheight = (1.41 * 3) / 297 // the slice height to be roughly 3 mm
    this.slices = []

    this.newx = 0
    this.newy = 0
    this.curw = 0
    this.intervals = []
    this.glomin = 0
    this.glomax = 0
  }

  startPath(time, objnum, curclient, x, y, type, color, w, pressure) {
    let intw = w
    if (pressure) intw *= pressure * 2

    this.newy = y
    this.newx = x
    this.curw = w

    this.glomax = Math.max(this.glomax, y + intw)
  }

  addToPath(time, objnum, curclient, x, y, pressure) {
    let intw = this.curw
    if (pressure) intw *= pressure * 2
    // now we add it to the corresponding slice, we assume short segments
    const weight =
      Math.sqrt(
        (this.newx - x) * (this.newx - x) + (this.newy - y) * (this.newy - y)
      ) * intw

    const slicepos = Math.round(((this.newy + y) * 0.5) / this.numslicesheight)

    if (typeof this.slices[slicepos] === 'undefined')
      this.slices[slicepos] = weight
    else this.slices[slicepos] += weight

    this.newy = y
    this.newx = x
    this.glomax = Math.max(this.glomax, y + intw)
  }

  finishPath(time, objnum, curclient) {
    // nothing to do
  }

  scrollBoard(time, x, y) {
    // do ... nothing....
  }

  addPicture(time, objnum, curclient, x, y, width, height, uuid) {
    const sliceposstart = Math.round(y / this.numslicesheight)
    const sliceposend = Math.round((y + height) / this.numslicesheight)
    const sliceweight = this.numsliceheight * width * 0.2 // adjust the factor
    this.glomax = Math.max(this.glomax, y + height)

    for (let slicepos = sliceposstart; slicepos < sliceposend; slicepos++) {
      if (typeof this.slices[slicepos] === 'undefined')
        this.slices[slicepos] = sliceweight
      else this.slices[slicepos] += sliceweight
    }
  }

  findPagebreak(pagemin, pagemax) {
    let lastquality = 1000
    let selpagebreak = pagemax

    const maxslicepos = Math.round(pagemax / this.numslicesheight)
    const minslicepos = Math.round(pagemin / this.numslicesheight)
    // console.log("findPageBreak",maxslicepos,minslicepos);

    for (let index = maxslicepos; index >= minslicepos; index--) {
      const pagebreak = (index + 0.5) * this.numslicesheight

      let density = 0.00001 * 0

      if (typeof this.slices[index] !== 'undefined') {
        density += this.slices[index]
      }
      // console.log("Test slice",density,index,pagebreak,this.slices[index]);

      const quality =
        density * (1 + 4 * (pagemax - pagebreak) * (pagemax - pagebreak))
      // console.log("qua,lqual",quality,lastquality);

      if (quality < lastquality) {
        selpagebreak = pagebreak
        lastquality = quality
      }
    }
    return selpagebreak
  }
}

export class Container extends Sink {
  constructor() {
    super()
    // this.maxobjectnumber=0;
    this.cursubobj = 0
    this.lasttime = {}
  }

  startPath(time, objnum, curclient, x, y, type, color, w, pressure) {
    const tempbuffer = new ArrayBuffer(36)
    const dataview = new DataView(tempbuffer)

    // long header 16 Bytes
    switch (type) {
      case 1:
        // marker
        dataview.setUint8(0, 3) // major command type, marker line path is 3

        break
      case 2:
        // eraser
        dataview.setUint8(0, 4) // major command type, marker eraser path is 4

        break
      case 0:
      default:
        dataview.setUint8(0, 0) // major command type, normal line path is 0

        break
    }

    dataview.setUint16(1, 36) // length  1..2
    dataview.setUint8(3, curclient) // reserved 3;
    dataview.setUint32(4, objnum) // 4.. 7
    dataview.setFloat64(8, time) // 8..15
    this.lasttime[objnum] = time // store time for simple header
    // aux data

    dataview.setFloat32(16, x) // 16-19
    dataview.setFloat32(20, y) // 20-23
    dataview.setFloat32(24, w) // 24-27
    // console.log("FDC sP 0 w:",w);
    dataview.setUint32(28, color) // 28-31
    let intpress = 0.5
    if (pressure) intpress = pressure
    dataview.setFloat32(32, intpress) // 32-35
    this.cursubobj = 1
    this.curobjnum = objnum

    this.pushArrayToStorage(tempbuffer)
  }

  addToPath(time, objnum, curclient, x, y, pressure) {
    // todo add objnum
    const tempbuffer = new ArrayBuffer(24)
    const dataview = new DataView(tempbuffer)

    // short header 8 Bytes
    dataview.setUint8(0, 1) // major command type, add to line path is 1
    dataview.setUint16(1, 24) // length  1..2
    dataview.setUint8(3, curclient) // reserved 3;
    dataview.setUint32(4, objnum) // 4.. 7
    dataview.setFloat32(8, time - this.lasttime[objnum]) // 8..11

    this.lasttime[objnum] = time // store time for simple header
    this.cursubobj++

    dataview.setFloat32(12, x) // 12-15
    dataview.setFloat32(16, y) // 16-19
    let intpress = 0.5
    if (pressure) intpress = pressure
    dataview.setFloat32(20, intpress) // 20-23

    this.pushArrayToStorage(tempbuffer)
  }

  finishPath(time, objnum, curclient) {
    const tempbuffer = new ArrayBuffer(12)
    const dataview = new DataView(tempbuffer)

    // short header 8 Bytes
    dataview.setUint8(0, 2) // major command type, close line path is 2
    dataview.setUint16(1, 12) // length  1..2
    dataview.setUint8(3, curclient) // reserved 3;
    dataview.setUint32(4, objnum) // 4.. 7
    dataview.setFloat32(8, time - this.lasttime[objnum]) // 8..11

    // this.lasttime=time; // store time for simple header
    delete this.lasttime[objnum]

    this.pushArrayToStorage(tempbuffer)

    this.cursubobj = 0
  }

  scrollBoard(time, x, y) {
    const tempbuffer = new ArrayBuffer(32) // actually it is a waste, but may be we need it later
    const dataview = new DataView(tempbuffer)

    dataview.setUint8(0, 5) // major command type, scroll board

    dataview.setUint16(1, 32) // length  1..2
    dataview.setUint8(3, 0) // reserved for future use 3
    dataview.setFloat64(4, time) // 4..11
    dataview.setFloat32(12, x) // 12-15 //absolute position
    dataview.setFloat32(16, y) // 16-19

    this.pushArrayToStorage(tempbuffer)
  }

  addPicture(time, objnum, curclient, x, y, width, height, id) {
    // ok id was before a uuid, now it is general a hex coded id
    const buflength = id.length / 2 // it is hex coded so two bytes per byte
    if (buflength > 255) {
      console.log('id too long!', id, buflength)
      return
    }

    const destlength = 32 + 1 + buflength

    const tempbuffer = new ArrayBuffer(destlength)
    const dataview = new DataView(tempbuffer)
    // console.log("addPicture in failsdata Container");
    dataview.setUint8(0, 6) // major command type, addpicture

    dataview.setUint16(1, destlength) // length  1..2
    dataview.setUint8(3, 0) // reserved for future use 3
    dataview.setUint32(4, objnum) // 4.. 7
    dataview.setFloat64(8, time) // 8..15
    dataview.setFloat32(16, x) // 16-19 //absolute position
    dataview.setFloat32(20, y) // 20-23
    dataview.setFloat32(24, width) // 24-27 //width and height
    dataview.setFloat32(28, height) // 28-31

    dataview.setUint8(32, buflength) // 32

    // convert uuid to bytes

    let dest = 33 // 33- +
    for (let i = 0; i < id.length; i += 2) {
      if (dest >= destlength) break
      dataview.setUint8(dest, parseInt(id.substr(i, 2), 16))
      dest++
    }

    this.pushArrayToStorage(tempbuffer)
  }
}

export class MemContainer extends Container {
  constructor(num, dummy) {
    super()
    this.storage = new ArrayBuffer(6400)
    this.storageAllocSize = 6400
    this.storageSize = 0
    this.number = num
  }

  pushArrayToStorage(array) {
    while (array.byteLength + this.storageSize > this.storageAllocSize) {
      // realloc data
      this.storageAllocSize *= 2
      const reallocstorage = new ArrayBuffer(this.storageAllocSize)
      new Uint8Array(reallocstorage).set(new Uint8Array(this.storage))
      this.storage = reallocstorage
    }
    new Uint8Array(this.storage).set(new Uint8Array(array), this.storageSize)
    // console.log("pATS",this.storageSize,array.byteLength,this);
    this.storageSize += array.byteLength
  }

  replaceStoredData(data) {
    if (data.byteLength > this.storageAllocSize) {
      this.storageAllocSize = data.byteLength + 6400
      this.storage = new ArrayBuffer(this.storageAllocSize)
    }
    this.storageSize = data.byteLength
    console.log(
      'replaceStorage data bl',
      data,
      data.byteLength,
      this.storageSize,
      this
    )
    new Uint8Array(this.storage).set(new Uint8Array(data)) // copy data
  }

  getElementTime(position, lasttime) {
    if (position + 8 > this.storageSize) return 0 // should never happen
    const dataview = new DataView(this.storage)
    const command = dataview.getUint8(position)
    let time = lasttime
    switch (command) {
      case 3:
      case 4:
      case 0:
        if (position + 16 > this.storageSize) return 0 // should never happen
        time = dataview.getFloat64(position + 8)

        break
      case 1:
      case 2:
        if (position + 8 > this.storageSize) return 0 // should never happen
        time += dataview.getFloat32(position + 4)

        break
      case 5:
        if (position + 20 > this.storageSize) return 0 // should never happen
        time = dataview.getFloat64(position + 4)

        break
      case 6:
        if (position + 48 > this.storageSize) return 0 // should never happen
        time = dataview.getFloat64(position + 8)

        break
    }
    return time
  }

  getElementObjnum(position, lastobjnum) {
    if (position + 8 > this.storageSize) return 0 // should never happen
    const dataview = new DataView(this.storage)
    const command = dataview.getUint8(position)
    let objnum = lastobjnum
    switch (command) {
      case 3:
      case 4:
      case 0:
        if (position + 16 > this.storageSize) return 0 // should never happen
        objnum = dataview.getUint32(position + 4)

        break
      case 1:
      case 2:
        if (position + 8 > this.storageSize) return 0 // should never happen
        objnum++

        break
      case 5:
        if (position + 20 > this.storageSize) return 0 // should never happen

        break
      case 6:
        if (position + 48 > this.storageSize) return 0 // should never happen
        objnum = dataview.getUint32(position + 4)

        break
    }
    return objnum
  }

  redrawElementTo(datasink, pos, lasttime) {
    // First Check size
    const dataview = new DataView(this.storage)
    if (2 + pos > this.storageSize) {
      // console.log("pos+2test",pos,this.storageSize);
      return -1 // this was the last element
    }
    const command = dataview.getUint8(pos)
    const length = dataview.getUint16(pos + 1)
    if (length + pos > this.storageSize) {
      // console.log("pos+lengthtest",pos,length,this.storageSize,command);
      return -1 // this was the last element
    }
    // console.log("rdE",length,pos,command,this.storageSize);

    switch (command) {
      case 3:
      case 4:
      case 0:
        {
          // now replay the data
          if (length < 32) {
            // console.log("damaged data1",length,pos);
            return -1 // damaged data
          }
          let type = 0
          if (command === 3) type = 1
          else if (command === 4) type = 2
          // console.log("rdE 0 w:",dataview.getFloat32(pos+24));
          // console.log("startpath length", length);
          datasink.startPath(
            dataview.getFloat64(pos + 8),
            dataview.getUint32(pos + 4),
            dataview.getUint8(pos + 3),
            dataview.getFloat32(pos + 16),
            dataview.getFloat32(pos + 20),
            type,
            dataview.getUint32(pos + 28),
            dataview.getFloat32(pos + 24),
            length < 36 ? 0.5 : dataview.getFloat32(pos + 32)
          )
        }
        break
      case 1:
        if (length < 20) return -1 // damaged data

        // console.log("addtoPath length", length);
        datasink.addToPath(
          lasttime + dataview.getFloat32(pos + 8),
          dataview.getUint32(pos + 4),
          dataview.getUint8(pos + 3),
          dataview.getFloat32(pos + 12),
          dataview.getFloat32(pos + 16),
          length < 24 ? 0.5 : dataview.getFloat32(pos + 20)
        )

        break
      case 2:
        if (length < 12) {
          // console.log("damaged data3");
          return -1 // damaged data
        }
        datasink.finishPath(
          lasttime + dataview.getFloat32(pos + 8),
          dataview.getUint32(pos + 4),
          dataview.getUint8(pos + 3)
        )

        break
      case 6:
        {
          //  console.log("addPicture in failsdata redraw");
          const idlength = dataview.getUint8(pos + 32)
          let nid = ''
          if (length < idlength + 1 + 32) {
            return -1 // damaged data
          }
          for (let i = 0; i < idlength; i++) {
            const number = dataview.getUint8(pos + 32 + 1 + i)
            let str = number.toString(16)
            if (str.length === 1) str = '0' + str
            nid += str
          }

          datasink.addPicture(
            dataview.getFloat64(pos + 8),
            dataview.getUint32(pos + 4),
            dataview.getUint8(pos + 3),
            dataview.getFloat32(pos + 16),
            dataview.getFloat32(pos + 20),
            dataview.getFloat32(pos + 24),
            dataview.getFloat32(pos + 28),
            nid
          )
        }
        break
    }

    return pos + length
  }

  reparseCommand(pos, commandstate) {
    // First Check size
    const dataview = new DataView(this.storage)
    if (2 + pos > this.storageSize) {
      // console.log("pos+2test",pos,this.storageSize, this);
      return -1 // this was the last element
    }
    const command = dataview.getUint8(pos)
    const length = dataview.getUint16(pos + 1)
    if (length + pos > this.storageSize) {
      // console.log("pos+lengthtest",pos,length,this.storageSize,command);
      return -1 // this was the last element
    }
    // console.log("rdE",length,pos,command,this.storageSize);

    switch (command) {
      case 5:
        // now replay the data
        if (length < 12) {
          // console.log("damaged data1",length,pos);
          return -1 // damaged data
        }

        commandstate.time = dataview.getFloat64(pos + 4)
        commandstate.scrollx = dataview.getFloat32(pos + 12)
        commandstate.scrolly = dataview.getFloat32(pos + 16)

        break
    }

    return pos + length
  }

  getCurCommandState() {
    let contpos = 0
    const commandstate = {}
    while (contpos >= 0) {
      contpos = this.reparseCommand(contpos, commandstate)
      // console.log("contpos",contpos);
    }
    return commandstate
  }
}

export class CallbackContainer extends Container {
  constructor(num, config) {
    super()
    this.writeData = config.writeData
    this.obj = config.obj
    this.number = num
  }

  pushArrayToStorage(array) {
    this.writeData(this.obj, this.number, array, true)
  }

  replaceStoredData(data) {
    this.writeData(this.obj, this.number, data, false)
  }
}

export class Collection extends Sink {
  constructor(containertype, containerconfig) {
    super()
    this.lasttime = 0

    this.lastcontainer = {}
    this.containers = []

    this.containertype = containertype
    this.containerconfig = containerconfig
    this.commandcontainer = this.containertype('command', containerconfig)
  }

  startPath(time, objnum, curclient, x, y, type, color, w, pressure) {
    const storagenum = Math.floor(y) // in Normalized coordinates we have rectangular areas
    // console.log("strnm SP",storagenum);
    if (!(storagenum in this.containers)) {
      // TODO for the network case sync with server
      this.containers[storagenum] = this.containertype(
        storagenum,
        this.containerconfig
      )
    }
    this.lastcontainer[objnum] = storagenum

    this.containers[storagenum].startPath(
      time,
      objnum,
      curclient,
      x,
      y,
      type,
      color,
      w,
      pressure
    )
  }

  addToPath(time, objnum, curclient, x, y, pressure) {
    const storagenum = this.lastcontainer[objnum] // in Normalized coordinates we have rectangular areas
    // console.log("strnm atp",storagenum);
    if (!(storagenum in this.containers)) {
      // TODO for the network case sync with server
      this.containers[storagenum] = this.containertype(
        storagenum,
        this.containerconfig
      )
    }

    this.containers[storagenum].addToPath(
      time,
      objnum,
      curclient,
      x,
      y,
      pressure
    )
  }

  finishPath(time, objnum, curclient) {
    const storagenum = this.lastcontainer[objnum] // in Normalized coordinates we have rectangular areas
    // console.log("strnm fp",storagenum);
    if (!(storagenum in this.containers)) {
      // TODO for the network case sync with server
      this.containers[storagenum] = this.containertype(
        storagenum,
        this.containerconfig
      )
    }
    delete this.lastcontainer[objnum]

    this.containers[storagenum].finishPath(time, objnum, curclient)
  }

  addPicture(time, objnum, curclient, x, y, width, height, uuid) {
    const storagenum = Math.floor(y) // in Normalized coordinates we have rectangular areas
    if (!(storagenum in this.containers)) {
      // TODO for the network case sync with server
      this.containers[storagenum] = this.containertype(
        storagenum,
        this.containerconfig
      )
    }
    // console.log("addPicture in failsdata collection",storagenum);

    this.containers[storagenum].addPicture(
      time,
      objnum,
      curclient,
      x,
      y,
      width,
      height,
      uuid
    )
  }

  scrollBoard(time, x, y) {
    this.commandcontainer.scrollBoard(time, x, y)
  }

  suggestRedraw(minareadrawn, maxareadrawn, curpostop, curposbottom) {
    // console.log("sugredraw",minareadrawn,maxareadrawn,curpostop,curposbottom);

    const minareadrawni = Math.floor(minareadrawn)
    const maxareadrawni = Math.floor(maxareadrawn)
    const curpostopi = Math.floor(curpostop)
    const curposbottomi = Math.floor(curposbottom)
    // console.log("sugredrawi",minareadrawni,maxareadrawni,curpostopi,curposbottomi);

    if (curpostopi - minareadrawni > 3) {
      // console.log('sg1')
      return true
    } // make the drawn area smaller
    //   console.log("sugredrawt1");
    if (maxareadrawni - curposbottomi > 3) {
      // console.log('sg2')
      return true
    } // make the drawn area smaller
    //    console.log("sugredrawt2");
    if (curpostopi - minareadrawni === 0 && curpostopi > 0) {
      // console.log('sg3')
      return true
    }
    //  console.log("sugredrawt3");
    // First step determine covered area
    let storedmin = 0
    let storedmax = 0
    this.containers.forEach(function (obj, num) {
      storedmin = Math.min(storedmin, num)
      storedmax = Math.max(storedmax, num)
    })
    //    console.log("sugredrawt4",storedmin,storedmax);
    if (maxareadrawni - curposbottomi === 0 && curposbottomi < storedmax) {
      // console.log('sg4')
      return true
    }
    //    console.log("sugredrawt5");
    return false
  }
  // var redrawcount=0;

  redrawTo(datasink, mindraw, maxdraw) {
    const contit = []
    const contpos = []
    const conttime = []
    const contobjnum = []

    let istart = 0
    let iend = this.containers.length

    if (mindraw) istart = Math.floor(mindraw)
    if (maxdraw) iend = Math.ceil(maxdraw)
    if (istart < 0) istart = 0

    // console.log("Redraw from to",istart,iend,redrawcount); redrawcount++;
    console.log('Dataavail from to', 0, this.containers.length)
    // istart=0;
    // iend=this.containers.length;

    for (let i = istart; i !== iend; i++) {
      if (this.containers[i] === undefined) continue
      contit.push(this.containers[i])
      contpos.push(0)
      conttime.push(this.containers[i].getElementTime(0, 0))
      contobjnum.push(this.containers[i].getElementObjnum(0, 0))
    }
    while (contit.length) {
      let targettime = 0
      let target = -1
      for (let i = 0; i < contit.length; i++) {
        // console.log("av",contobjnum[i],conttime[i]);
        if (i === 0 || targettime > conttime[i]) {
          targettime = conttime[i]
          target = i
        }
      }

      if (target === -1) break // nothing found weird
      contpos[target] = contit[target].redrawElementTo(
        datasink,
        contpos[target],
        conttime[target]
      )
      // console.log("targettime",targettime,targetobjnum);
      this.lasttime = targettime
      if (contpos[target] < 0) {
        // remove from array
        contpos.splice(target, 1)
        contit.splice(target, 1)
        conttime.splice(target, 1)
        contobjnum.splice(target, 1)
      } else {
        conttime[target] = contit[target].getElementTime(
          contpos[target],
          conttime[target]
        )
        contobjnum[target] = contit[target].getElementObjnum(
          contpos[target],
          contobjnum[target]
        )
      }
    }
  }

  clearContainers() {
    this.containers = []
    this.lasttime = 0

    this.lastcontainer = 0
    this.commandcontainer = this.containertype('command', this.containerconfig)
    console.log('clear Containers')
  }

  replaceStoredData(i, data) {
    if (i === 'command') {
      this.commandcontainer.replaceStoredData(data)
    } else {
      if (!(i in this.containers)) {
        this.containers[i] = this.containertype(i, this.containerconfig)
      }
      this.containers[i].replaceStoredData(data)
    }
  }
}

export class Dispatcher extends Sink {
  constructor() {
    super()
    this.datasinklist = []
    // this.curobjectnumber=0;
    this.curclientnum = 0

    this.blocked = false

    this.scrollx = this.scrolly = 0

    this.starttime = now()
  }

  getNewObjectNumber() {
    const retnumber = this.curobjectnumber
    this.curobjectnumber++
    return retnumber
  }

  /*
    fixObjNumber(objnum)
    {
        if (!objnum) return this.getNewObjectNumber();
        if (objnum<=this.curobjectnumber) { // is probably broken or restarted
            return this.getNewObjectNumber();
        } else {
            this.curobjectnumber=objnum+1;
        }
    } */

  getTime() {
    return now() - this.starttime
  }

  addSink(sink) {
    this.datasinklist.push(sink)
  }

  startPath(time, objnum, curclient, x, y, type, color, w, pressure) {
    // console.log("FDD sP",this);
    if (this.blocked) return
    let i
    // var object=this.fixObjNumber(objnum);
    const object = objnum
    // console.log("FDD startPath",time,objnum,curclient,x,y,w,color);

    let timeset = time
    if (!timeset) timeset = now() - this.starttime

    let client = curclient
    if (!client) client = this.curclientnum
    // console.log("FDD startPath2",timeset,object,client,x,y,w,color);
    for (i = 0; i < this.datasinklist.length; i++) {
      this.datasinklist[i].startPath(
        timeset,
        object,
        client,
        x,
        y,
        type,
        color,
        w,
        pressure
      )
    }
  }

  addToPath(time, objnum, curclient, x, y, pressure) {
    // console.log("FDD aTP",this);
    if (this.blocked) return
    let client = curclient
    if (!curclient) client = this.curclientnum
    let timeset = time
    if (!timeset) timeset = now() - this.starttime

    let i
    for (i = 0; i < this.datasinklist.length; i++) {
      this.datasinklist[i].addToPath(timeset, objnum, client, x, y, pressure)
    }
  }

  finishPath(time, objnum, curclient) {
    // console.log("FDD fP",this);
    if (this.blocked) return
    let client = curclient
    if (!curclient) client = this.curclientnum
    let timeset = time
    if (!timeset) timeset = now() - this.starttime

    let i
    for (i = 0; i < this.datasinklist.length; i++) {
      this.datasinklist[i].finishPath(timeset, objnum, client)
    }
  }

  scrollBoard(time, x, y) {
    this.setTimeandScrollPos(time, x, y)
    let timeset = time
    if (!timeset) timeset = now() - this.starttime
    let i
    for (i = 0; i < this.datasinklist.length; i++) {
      this.datasinklist[i].scrollBoard(timeset, x, y)
    }
  }

  addPicture(time, objnum, curclient, x, y, width, height, uuid) {
    // console.log("addPicture in failsdata dispatcher before blocked");
    if (this.blocked) return
    let i
    // var object=this.fixObjNumber(objnum);
    const object = objnum
    // console.log("FDD startPath",time,objnum,curclient,x,y,w,color);

    let timeset = time
    if (!timeset) timeset = now() - this.starttime

    let client = curclient
    if (!client) client = this.curclientnum
    // console.log("addPicture in failsdata dispatcher");

    for (i = 0; i < this.datasinklist.length; i++) {
      this.datasinklist[i].addPicture(
        timeset,
        object,
        client,
        x,
        y,
        width,
        height,
        uuid
      )
    }
  }

  setTimeandScrollPos(time, scrollx, scrolly) {
    if (time) {
      // time= now()-starttime
      // console.log("timeadjusted now",now(),time);
      this.starttime = now() - time // adjusttime
      // console.log("timeadjusted",this.starttime,time);
    }
    if (scrollx) this.scrollx = scrollx
    if (scrolly) this.scrolly = scrolly
  }
}

export class NetworkSink extends Sink {
  constructor(send) {
    super()
    this.sendfunc = send
  }

  startPath(time, objnum, curclient, x, y, type, color, w, pressure) {
    const outobj = {}
    outobj.task = 'startPath'
    outobj.time = time
    outobj.objnum = objnum
    outobj.curclient = curclient
    outobj.x = x
    outobj.y = y
    outobj.type = type
    outobj.color = color
    outobj.w = w
    outobj.pressure = pressure
    this.sendfunc(outobj)
  }

  addToPath(time, objnum, curclient, x, y, pressure) {
    const outobj = {}
    outobj.task = 'addToPath'
    outobj.time = time
    outobj.objnum = objnum
    outobj.curclient = curclient
    outobj.x = x
    outobj.y = y
    outobj.pressure = pressure
    this.sendfunc(outobj)
  }

  finishPath(time, objnum, curclient) {
    const outobj = {}
    outobj.task = 'finishPath'
    outobj.time = time
    outobj.objnum = objnum
    outobj.curclient = curclient
    this.sendfunc(outobj)
  }

  addPicture(time, objnum, curclient, x, y, width, height, uuid) {
    const outobj = {}
    outobj.task = 'addPicture'
    outobj.time = time
    outobj.objnum = objnum
    outobj.curclient = curclient
    outobj.x = x
    outobj.y = y
    outobj.width = width
    outobj.height = height
    outobj.uuid = uuid
    this.sendfunc(outobj)
  }

  scrollBoard(time, x, y) {
    const outobj = {}
    outobj.task = 'scrollBoard'
    outobj.time = time
    outobj.x = x
    outobj.y = y
    this.sendfunc(outobj)
  }
}

export class NetworkSource {
  constructor(sink) {
    this.sink = sink
  }

  receiveData(data) {
    const sink = this.sink
    switch (data.task) {
      case 'startPath':
        // console.log("FDNS sP",data);
        sink.startPath(
          data.time,
          data.objnum,
          data.curclient,
          data.x,
          data.y,
          data.type,
          data.color,
          data.w,
          data.pressure
        )

        break
      case 'addToPath':
        // console.log("FDNS aTp",data);
        sink.addToPath(
          data.time,
          data.objnum,
          data.curclient,
          data.x,
          data.y,
          data.pressure
        )

        break
      case 'finishPath':
        // console.log("FDNS fP",data);
        sink.finishPath(data.time, data.objnum, data.curclient)

        break
      case 'scrollBoard':
        sink.scrollBoard(data.time, data.x, data.y)

        break
      case 'addPicture':
        // console.log("addPicture in failsdata receive Data Networksource");
        sink.addPicture(
          data.time,
          data.objnum,
          data.curclient,
          data.x,
          data.y,
          data.width,
          data.height,
          data.uuid
        )

        break
    }
  }
}

export class DrawObject {
  constructor(type, objid) {
    this.type = type
    this.version = 0
    this.objid = objid
  }
}

export class DrawObjectPicture extends DrawObject {
  constructor(objid) {
    super('image', objid)
  }

  addPicture(x, y, width, height, uuid, url, mimetype) {
    this.posx = x
    this.posy = y
    this.width = width
    this.height = height
    this.uuid = uuid
    this.url = url
    this.mimetype = mimetype
  }
}

export class DrawObjectGlyph extends DrawObject {
  constructor(objid) {
    super('glyph', objid)
    this.svgscale = 2000 // should be kept constant
    this.svgpathversion = -1
    this.svgpathstring = null
  }

  startPath(x, y, type, color, width, pressure) {
    const scolor = Color(color).hex()

    const penwidth = this.svgscale * width

    let penw = penwidth
    let curpress = 0.5
    if (pressure) curpress = pressure
    penw *= curpress * 0.5 * 2 + 0.5

    const px = x * this.svgscale
    const py = y * this.svgscale

    this.startpoint = { x: px, y: py }
    this.lastpoint = { x: px, y: py }
    this.endpoint = null
    this.gtype = type
    /*  workpathstart: "",
            workpathend:"Z", */
    this.pathpoints = [{ x: px, y: py, w: penw }]
    this.startradius = penw * 0.5
    this.penwidth = penwidth
    this.color = scolor
    this.pressure = curpress
    this.area = {
      left: -2 * penw,
      right: 2 * penw,
      top: -2 * penw,
      bottom: 2 * penw
    }

    this.version++ // increment version
  }

  addToPath(x, y, pressure) {
    const px = x * this.svgscale
    const py = y * this.svgscale

    const wx = this.lastpoint.x
    const wy = this.lastpoint.y
    const sx = this.startpoint.x
    const sy = this.startpoint.y
    let dx = px - wx
    let dy = py - wy
    let wpenw = this.penwidth
    // console.log("status pressure", pressure,wpenw);
    // console.log("atopath",wx,px,wy,py);
    const norm = Math.sqrt(dx * dx + dy * dy)
    if (norm < this.penwidth * 0.05) {
      return // ok folks filter the nonsense out
    }

    let curpress = 0.5
    if (pressure) curpress = pressure

    const fac = 0.1
    curpress = curpress * fac + (1 - fac) * this.pressure
    // console.log("pressure problem",curpress,0.5+curpress,wpenw);
    wpenw *= 0.5 * curpress * 2 + 0.5

    dx *= 1 / norm
    dy *= 1 / norm

    const ws = this.area
    const pw = wpenw

    this.lastpoint = { x: px, y: py }
    this.pathpoints.push({ x: px, y: py, w: pw })
    this.area = {
      left: Math.min(px - sx - 2 * pw, ws.left),
      right: Math.max(px - sx + 2 * pw, ws.right),
      top: Math.min(py - sy - 2 * pw, ws.top),
      bottom: Math.max(py - sy + 2 * pw, ws.bottom)
    }
    this.pressure = curpress
    this.version++ // increment version
  }

  finishPath() {
    // so far a nop
    this.version++ // increment version
  }

  SVGPath() {
    if (this.svgpathversion === this.version) {
      // console.log("cached path", this.svgpathstring);
      return this.svgpathstring // perfect no work todo
    }

    const glyph = this
    if (glyph.pathpoints && glyph.pathpoints.length > 2) {
      // was 2
      // let lastpoint = null
      // if (glyph.pathpoints && glyph.pathpoints.length > 2)
      //   lastpoint = glyph.pathpoints[glyph.pathpoints.length - 1]
      let firstpoint = null
      if (glyph.pathpoints && glyph.pathpoints.length > 0)
        firstpoint = glyph.pathpoints[0]

      const sx = firstpoint ? firstpoint.x : 0
      const sy = firstpoint ? firstpoint.y : 0
      // console.log(glyph.pathpoints);
      const harr = glyph.pathpoints.length + 1
      const pathstrings = new Array(2 * harr + 1)
      // let lastnx=null;
      // let lastny=null;
      for (let i = 0; i < glyph.pathpoints.length; i++) {
        const curpoint = glyph.pathpoints[i]
        let dx = 0
        let dy = 0
        if (i > 0) {
          dx += curpoint.x - glyph.pathpoints[i - 1].x
          dy += curpoint.y - glyph.pathpoints[i - 1].y
        }

        if (i + 1 < glyph.pathpoints.length) {
          dx += glyph.pathpoints[i + 1].x - curpoint.x
          dy += glyph.pathpoints[i + 1].y - curpoint.y
        }

        let norm = Math.sqrt(dx * dx + dy * dy)

        if (norm < curpoint.w * 0.5 * 0.1) {
          // very rare case, but very stupid
          if (i === 0) continue
          dx = curpoint.x - glyph.pathpoints[i - 1].x
          dy = curpoint.y - glyph.pathpoints[i - 1].y
          norm = Math.sqrt(dx * dx + dy * dy)
        }

        dx *= 1 / norm
        dy *= 1 / norm
        // now use cross product with (0,0,1)
        const nx = dy * curpoint.w * 0.5
        const ny = -dx * curpoint.w * 0.5

        let wsadd = ''

        if (i === 0) {
          // wsadd="M"+(curpoint.x-sx+nx).toFixed(2)+","+(curpoint.y-sy+ny).toFixed(2)+" ";
        } else {
          wsadd =
            'L' +
            (curpoint.x - sx + nx).toFixed(2) +
            ',' +
            (curpoint.y - sy + ny).toFixed(2) +
            ' '
        }
        const weadd =
          'L' +
          (curpoint.x - sx - nx).toFixed(2) +
          ',' +
          (curpoint.y - sy - ny).toFixed(2) +
          ' '

        pathstrings[i + 1] = wsadd
        pathstrings[2 * harr - i - 1] = weadd
        if (i === 0) {
          pathstrings[0] =
            'M' +
            (curpoint.x - sx - nx).toFixed(2) +
            ',' +
            (curpoint.y - sy - ny).toFixed(2) +
            ' '
          pathstrings[1] =
            'A' +
            (curpoint.w * 0.5).toFixed(2) +
            ',' +
            (curpoint.w * 0.5).toFixed(2) +
            ',0,1,1,' +
            (curpoint.x - sx + nx).toFixed(2) +
            ',' +
            (curpoint.y - sy + ny).toFixed(2) +
            ' '
        }
        if (i === glyph.pathpoints.length - 1) {
          pathstrings[harr] =
            'A' +
            (curpoint.w * 0.5).toFixed(2) +
            ',' +
            (curpoint.w * 0.5).toFixed(2) +
            ',0,1,1,' +
            (curpoint.x - sx - nx).toFixed(2) +
            ',' +
            (curpoint.y - sy - ny).toFixed(2) +
            ' '
        }
      }
      pathstrings[2 * harr] = 'Z'
      // console.log("pathstrings mystery", pathstrings);
      this.svgpathstring = pathstrings.join('')
      this.svgpathversion = this.version
      // console.log("calculated path", this.svgpathstring);
      return this.svgpathstring
    } else if (glyph.pathpoints && glyph.pathpoints.length > 0) {
      // single point case
      let firstpoint = null
      if (glyph.pathpoints && glyph.pathpoints.length > 0)
        firstpoint = glyph.pathpoints[0]
      const sx = firstpoint ? firstpoint.x : 0
      const sy = firstpoint ? firstpoint.y : 0

      const curpoint = glyph.pathpoints[0]
      // handle single point
      this.svgpathstring =
        'M' +
        (curpoint.x - curpoint.w * 0.5 - sx).toFixed(2) +
        ',' +
        (curpoint.y - sy).toFixed(2) +
        ' ' +
        'A' +
        (curpoint.w * 0.5).toFixed(2) +
        ',' +
        (curpoint.w * 0.5).toFixed(2) +
        ',0,1,1,' +
        (curpoint.x + curpoint.w * 0.5 - sx).toFixed(2) +
        ',' +
        (curpoint.y - sy).toFixed(2) +
        'A' +
        (curpoint.w * 0.5).toFixed(2) +
        ',' +
        (curpoint.w * 0.5).toFixed(2) +
        ',0,1,1,' +
        (curpoint.x - curpoint.w * 0.5 - sx).toFixed(2) +
        ',' +
        (curpoint.y - sy).toFixed(2) +
        ' Z'
      this.svgpathversion = this.version
      // console.log("single point svg", this.svgpathstring);
      return this.svgpathstring
    } else return null
  }
}
