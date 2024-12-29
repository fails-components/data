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

// eslint-disable-next-line no-undef
const now = () => performance.now

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

  scrollBoard(time, clientnum, x, y) {
    // do nothing in base class
  }

  addPicture(time, objnum, curclient, x, y, width, height, uuid) {
    // do nothing in base class
  }

  addForm(
    time,
    objnum,
    curclient,
    x,
    y,
    width,
    height,
    type,
    bColor,
    fColor,
    lw
  ) {
    // do nothing in base class
  }

  deleteObject(time, objnum, curclient, storagenum) {
    // do nothing in base class
  }

  moveObject(time, objnum, curclient, x, y) {
    // do nothing in base class, note a change of storagenum is not allowed
  }

  startApp(time, x, y, width, height, id, sha, appid) {
    // do nothing in base class
  }

  moveApp(time, x, y, width, height) {
    // do nothing in base class
  }

  closeApp(time) {
    // do nothing in base class
  }

  dataApp(time, buffer) {
    // do nothing in base class
  }
}

export class Container extends Sink {
  constructor() {
    super()
    // this.maxobjectnumber=0;
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
    if (objnum in this.lasttime) {
      dataview.setFloat32(8, time - this.lasttime[objnum]) // 8..11
    } else {
      dataview.setFloat32(8, 0) // 8..11
    }

    this.lasttime[objnum] = time // store time for simple header

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
    if (objnum in this.lasttime) {
      dataview.setFloat32(8, time - this.lasttime[objnum]) // 8..11
    } else {
      dataview.setFloat32(8, 0) // 8..11
    }

    // this.lasttime=time; // store time for simple header
    delete this.lasttime[objnum]

    this.pushArrayToStorage(tempbuffer)
  }

  scrollBoard(time, clientnum, x, y) {
    // clientnum is ignored, only relevant for live scrolling
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

  addForm(
    time,
    objnum,
    curclient,
    x,
    y,
    width,
    height,
    type,
    bColor,
    fColor,
    lw
  ) {
    const tempbuffer = new ArrayBuffer(45)
    const dataview = new DataView(tempbuffer)

    // long header 16 Bytes
    dataview.setUint8(0, 9) // major command type, forms is 9

    dataview.setUint16(1, 45) // length  1..2
    dataview.setUint8(3, curclient) // reserved 3;
    dataview.setUint32(4, objnum) // 4.. 7
    dataview.setFloat64(8, time) // 8..15
    this.lasttime[objnum] = time // store time for simple header
    // aux data

    dataview.setFloat32(16, x) // 16-19
    dataview.setFloat32(20, y) // 20-23
    dataview.setFloat32(24, width) // 24-27
    dataview.setFloat32(28, height) // 28-31

    // console.log("FDC sP 0 w:",w);
    dataview.setUint32(32, bColor) // 32-35
    dataview.setUint32(36, fColor) // 36-39
    dataview.setFloat32(40, lw) // 40-43
    switch (type) {
      case 1: // line
      case 2: // rectangle
      case 3: // circle
      case 4: // ellipse
        dataview.setUint8(44, type) // 44
        break
      default:
        dataview.setUint8(44, 1) // 44
        break
    }
    this.curobjnum = objnum

    this.pushArrayToStorage(tempbuffer)
  }

  deleteObject(time, objnum, curclient, storagenum) {
    const tempbuffer = new ArrayBuffer(16)
    const dataview = new DataView(tempbuffer)

    // short header 8 Bytes
    dataview.setUint8(0, 7) // major command type, delete object is  7
    dataview.setUint16(1, 16) // length  1..2
    dataview.setUint8(3, curclient) // reserved 3;
    dataview.setUint32(4, objnum) // 4.. 7
    dataview.setFloat64(8, time) // 8..15

    this.pushArrayToStorage(tempbuffer)
  }

  moveObject(time, objnum, curclient, x, y) {
    const tempbuffer = new ArrayBuffer(24)
    const dataview = new DataView(tempbuffer)

    // short header 8 Bytes
    dataview.setUint8(0, 8) // major command type, move object is 8
    dataview.setUint16(1, 24) // length  1..2
    dataview.setUint8(3, curclient) // reserved 3;
    dataview.setUint32(4, objnum) // 4.. 7
    dataview.setFloat64(8, time) // 8..15

    dataview.setFloat32(16, x) // 16-19
    dataview.setFloat32(20, y) // 20-23

    this.pushArrayToStorage(tempbuffer)
  }

  startApp(time, x, y, width, height, id, sha, appid) {
    if (typeof id !== 'string') return
    if (typeof sha !== 'string') return
    if (typeof appid !== 'string') return

    const buflength = sha.length / 2 // it is hex coded so two bytes per byte
    if (buflength !== 32) {
      console.log('sha not equal 256 bits!', sha, buflength)
      return
    }
    if (appid.length !== 36) {
      console.log('appid not equal to 36 bar streing ', appid)
      return
    }
    try {
      const tempbuffer = new ArrayBuffer(84)
      const dataview = new DataView(tempbuffer)

      dataview.setUint8(0, 10) // major command type, startApp is 10

      dataview.setUint16(1, 84) // length  1..2
      dataview.setUint8(3, 0) // reserved 3
      dataview.setFloat64(4, time) // 4..11
      // positioning
      dataview.setFloat32(12, x) // 12-15
      dataview.setFloat32(16, y) // 16-19
      dataview.setFloat32(20, width) // 20-23
      dataview.setFloat32(24, height) // 24-27
      let id64 = 0n
      // We start with the id, it is 36 coded and 9 tokens long, which means max 6 bytes
      for (const num of id) {
        id64 = id64 * 36n + BigInt(parseInt(num, 36))
      }
      dataview.setBigUint64(28, id64) // 28-35
      // now the sha
      let dest = 36 // 36-67
      for (let i = 0; i < 32 * 2; i += 2) {
        dataview.setUint8(dest, parseInt(sha.substr(i, 2), 16))
        dest++
      }
      // parse uuid
      dest = 68 // 68-83
      for (let i = 0; i < 36; i += 2) {
        if (appid.substr(i, 1) === '-') i++
        dataview.setUint8(dest, parseInt(appid.substr(i, 2), 16))
        dest++
      }
      this.pushArrayToStorage(tempbuffer)
    } catch (error) {
      // TODO later fall silently
      console.log('startApp problem', error)
    }
  }

  closeApp(time) {
    const tempbuffer = new ArrayBuffer(12)
    const dataview = new DataView(tempbuffer)
    dataview.setUint8(0, 11) // major command type, closeApp is 11
    dataview.setUint16(1, 12) // length  1..2
    dataview.setUint8(3, 0) // reserved 3
    dataview.setFloat64(4, time) // 4..11
    this.pushArrayToStorage(tempbuffer)
  }

  dataApp(time, buffer) {
    // this one is tricky
    const ab = buffer instanceof ArrayBuffer ? buffer : buffer.buffer
    if (!ab) return
    // header length is 8 bytes for the start, and 4 bytes for continuation
    const length = ab.byteLength
    let chunks = 1
    let dvlength = 0
    if (length >= 0xffff - 8) {
      dvlength += 0xffff
      const addchunks = Math.ceil((length - 0xffff + 8) / (0xffff - 4))
      const lastchunklen = (length - 0xffff + 8) % (0xffff - 4)
      dvlength += (addchunks - 1) * 0xffff
      dvlength += lastchunklen + 4
      chunks += addchunks
    } else {
      dvlength = 8 + length
    }
    const tempbuffer = new ArrayBuffer(dvlength)
    const dataview = new DataView(tempbuffer)
    const arrayview = new Uint8Array(tempbuffer)
    let pos = 0
    let remainlength = length
    let bufferpos = 0
    for (let chunk = 0; chunk < chunks; chunk++) {
      const headersize = chunk === 0 ? 8 : 4
      const payloadsize = Math.max(0xffff - headersize, remainlength)
      dataview.setUint8(pos + 0, 12) // major command type, dataApp is 12
      dataview.setUint16(pos + 1, Math.max(0xff, payloadsize + headersize)) // length  1..2
      dataview.setUint8(
        pos + 3,
        chunk === 0 ? 1 /* default coding */ : 0 /* continue */
      ) // coding 3
      // if coding is
      // 0 continuation
      // 1 start with default coding
      if (chunk === 0) dataview.setFloat64(pos + 4, time) // 4..11
      pos += headersize
      const ua = new Uint8Array(buffer, bufferpos, payloadsize)
      arrayview.set(ua, pos)
      pos += headersize
      remainlength -= payloadsize
      bufferpos += payloadsize
    }
    this.pushArrayToStorage(tempbuffer)
  }

  moveApp(time, x, y, width, height, deactivate) {
    const tempbuffer = new ArrayBuffer(28)
    const dataview = new DataView(tempbuffer)

    dataview.setUint8(0, 13) // major command type, moveApp is 13

    dataview.setUint16(1, 28) // length  1..2
    dataview.setUint8(3, 0 | (deactivate && 0x1)) // reserved 3
    dataview.setFloat64(4, time) // 4..11
    // positioning
    dataview.setFloat32(12, x) // 12-15
    dataview.setFloat32(16, y) // 16-19
    dataview.setFloat32(20, width) // 20-23
    dataview.setFloat32(24, height) // 24-27

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

  getContainerData() {
    const clonestorage = new ArrayBuffer(this.storageSize)
    new Uint8Array(clonestorage).set(
      new Uint8Array(this.storage, 0, this.storageSize)
    ) // copy data
    return clonestorage
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
    /* console.log(
      'replaceStorage data bl',
      data,
      data.byteLength,
      this.storageSize,
      this
    ) */
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
      case 7:
        if (position + 16 > this.storageSize) return 0 // should never happen
        time = dataview.getFloat64(position + 8)
        break
      case 8:
        if (position + 24 > this.storageSize) return 0 // should never happen
        time = dataview.getFloat64(position + 8)
        break
      case 9:
        if (position + 45 > this.storageSize) return 0 // should never happen
        time = dataview.getFloat64(position + 8)
        break
      case 10:
        if (position + 84 > this.storageSize) return 0 // should never happen
        time = dataview.getFloat64(position + 4)
        break
      case 11:
        if (position + 12 > this.storageSize) return 0 // should never happen
        time = dataview.getFloat64(position + 4)
        break
      case 12:
        {
          // Note we only ensure header sizes here, not payload
          const type = dataview.getUint8(position + 3)
          if (type !== 0) {
            // no continuation
            if (position + 8 > this.storageSize) return 0 // should never happen
            time = dataview.getFloat64(position + 4)
          } else {
            if (position + 4 > this.storageSize) return 0 // should never happen
          }
        }
        break
      case 13:
        if (position + 28 > this.storageSize) return 0 // should never happen
        time = dataview.getFloat64(position + 4)
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
      case 7:
        if (position + 16 > this.storageSize) return 0 // should never happen
        objnum = dataview.getUint32(position + 4)

        break
      case 1:
      case 8:
        if (position + 24 > this.storageSize) return 0 // should never happen
        objnum = dataview.getUint32(position + 4)

        break
      case 2:
        if (position + 12 > this.storageSize) return 0 // should never happen
        objnum = dataview.getUint32(position + 4)

        break
      case 5:
        if (position + 20 > this.storageSize) return 0 // should never happen

        break
      case 6:
        if (position + 48 > this.storageSize) return 0 // should never happen
        objnum = dataview.getUint32(position + 4)

        break
      case 9:
        if (position + 45 > this.storageSize) return 0 // should never happen
        objnum = dataview.getUint32(position + 4)
        break
      case 10:
        if (position + 84 > this.storageSize) return 0 // should never happen
        break
      case 11:
        if (position + 12 > this.storageSize) return 0 // should never happen
        break
      case 12:
        {
          // Note we only ensure header sizes here, not payload
          const type = dataview.getUint8(position + 3)
          if (type !== 0) {
            // no continuation
            if (position + 8 > this.storageSize) return 0 // should never happen
          } else {
            if (position + 4 > this.storageSize) return 0 // should never happen
          }
        }
        break
      case 13:
        if (position + 28 > this.storageSize) return 0 // should never happen
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
      case 7:
        // now replay the data
        if (length < 16) {
          return -1 // damaged data
        }
        datasink.deleteObject(
          dataview.getFloat64(pos + 8),
          dataview.getUint32(pos + 4),
          dataview.getUint8(pos + 3),
          null
        )

        break
      case 8:
        // now replay the data
        if (length < 24) {
          return -1 // damaged data
        }
        datasink.moveObject(
          dataview.getFloat64(pos + 8),
          dataview.getUint32(pos + 4),
          dataview.getUint8(pos + 3),
          dataview.getFloat32(pos + 16),
          dataview.getFloat32(pos + 20)
        )

        break
      case 9:
        // now replay the data
        if (length < 45) {
          // console.log("damaged data1",length,pos);
          return -1 // damaged data
        }
        // console.log("rdE 0 w:",dataview.getFloat32(pos+24));
        // console.log("startpath length", length);
        datasink.addForm(
          dataview.getFloat64(pos + 8),
          dataview.getUint32(pos + 4),
          dataview.getUint8(pos + 3),
          dataview.getFloat32(pos + 16),
          dataview.getFloat32(pos + 20),
          dataview.getFloat32(pos + 24),
          dataview.getFloat32(pos + 28),
          dataview.getUint8(pos + 44),
          dataview.getUint32(pos + 32),
          dataview.getUint32(pos + 36),
          dataview.getFloat32(pos + 40)
        )

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

  reparseJupyter(datasink, pos) {
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
      case 10:
        {
          // now replay the data
          if (length < 84) {
            // console.log("damaged data1",length,pos);
            return -1 // damaged data
          }
          const id64 = dataview.getBigUint64(pos + 28) // 28-35
          const id = id64.toString(36).padStart(9, '0')
          // ok read sha
          let sha = ''
          let src = 36 // 36-67
          for (let i = 0; i < 32 * 2; i += 2) {
            const number = dataview.getUint8(pos + src)
            sha += number.toString(16).padStart(2, '0')
            src++
          }
          // now the uuid
          src = 68 // 68-83
          let appid = ''
          for (let i = 0; i < 32; i += 2) {
            const number = dataview.getUint8(pos + src)
            appid += number.toString(16).padStart(2, '0')
            if (i === 6 || i === 10 || i === 14 || i === 18) appid += '-'
            src++
          }
          datasink.startApp(
            dataview.getFloat64(pos + 4), // 4..11 time
            dataview.getFloat32(pos + 12), // 12-15 x
            dataview.getFloat32(pos + 16), // 16-19 y
            dataview.getFloat32(pos + 20), // 20-23 width
            dataview.getFloat32(pos + 24), // 24-27 height
            id,
            sha,
            appid
          )
        }
        break
      case 11:
        // now replay the data
        if (length < 12) {
          // console.log("damaged data1",length,pos);
          return -1 // damaged data
        }
        datasink.closeApp(dataview.getFloat64(pos + 4))
        break
      case 12:
        {
          // this one is tricky, we need all frames in order to proceed
          let payloadsize = 0
          // sizescan
          let scanpos = 0
          let time
          while (true) {
            if (length < 4 + scanpos) {
              return -1 // damaged data
            }
            const size = dataview.getUint16(pos + scanpos + +1)
            const type = dataview.getUint8(pos + scanpos + 3)
            if (scanpos > 0 && type !== 0 /* not continuation */) return -1 // damaged data
            if (length < scanpos + size) {
              return -1 // damaged data
            }
            if (type > 0) {
              time = dataview.getFloat64(pos + scanpos + 4)
            }
            const headerlength = type !== 0 ? 8 : 4
            payloadsize += size - headerlength
            if (size !== 0xffff) break
            scanpos += size
          }
          const data = new Uint8Array(payloadsize)
          let copypos = 0
          scanpos = 0
          while (copypos !== payloadsize) {
            const size = dataview.getUint16(pos + scanpos + +1)
            const type = dataview.getUint8(pos + scanpos + 3)
            const headerlength = type !== 0 ? 8 : 4
            const payloadlen = size - headerlength
            const srcArray = new Uint8Array(
              dataview.buffer,
              pos + scanpos + headerlength,
              payloadlen
            )
            data.set(srcArray, copypos)
            copypos += payloadlen
            scanpos += size
          }
          datasink.dataApp(time, data)
        }
        break
      case 13:
        {
          // now replay the data
          if (length < 28) {
            // console.log("damaged data1",length,pos);
            return -1 // damaged data
          }
          const properties = dataview.getInt8(pos + 3)
          datasink.moveApp(
            dataview.getFloat64(pos + 4), // 4..11 time
            dataview.getFloat32(pos + 12), // 12-15 x
            dataview.getFloat32(pos + 16), // 16-19 y
            dataview.getFloat32(pos + 20), // 20-23 width
            dataview.getFloat32(pos + 24), // 24-27 height
            !!(properties & 0x1)
          )
        }
        break
    }

    return pos + length
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
    this.contdirty = []
    this.dirty = false

    this.containertype = containertype
    this.containerconfig = containerconfig
    this.commandcontainer = this.containertype('command', containerconfig)
    this.jupytercontainer = this.containertype('jupyter', containerconfig)
  }

  setOnDirty(cb) {
    this.ondirty = cb
    this.ondirty(this.dirty)
  }

  unDirty(cont) {
    this.contdirty[cont] = false
    if (!this.contdirty.some((el) => !!el)) {
      if (this.dirty) {
        this.dirty = false
        if (this.ondirty) this.ondirty(false)
      }
    }
  }

  checkContainerExistsAndDirty(storagenum) {
    if (!(storagenum in this.containers)) {
      // TODO for the network case sync with server
      this.containers[storagenum] = this.containertype(
        storagenum,
        this.containerconfig
      )
    }
    if (!this.contdirty[storagenum]) {
      this.contdirty[storagenum] = true
      if (!this.dirty) {
        this.dirty = true
        if (this.ondirty) this.ondirty()
      }
    }
  }

  startPath(time, objnum, curclient, x, y, type, color, w, pressure) {
    const storagenum = Math.floor(y) // in Normalized coordinates we have rectangular areas
    // console.log("strnm SP",storagenum);
    this.checkContainerExistsAndDirty(storagenum)
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
    if (!(objnum in this.lastcontainer)) {
      this.lastcontainer[objnum] = Math.floor(y) // may be not optimal, but better than nothing
    }
    const storagenum = this.lastcontainer[objnum] // in Normalized coordinates we have rectangular areas
    // console.log("strnm atp",storagenum);
    this.checkContainerExistsAndDirty(storagenum)

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
    if (!(objnum in this.lastcontainer)) {
      // we have to skip it, no guess possible
      return
    }
    const storagenum = this.lastcontainer[objnum] // in Normalized coordinates we have rectangular areas
    // console.log("strnm fp",storagenum);
    this.checkContainerExistsAndDirty(storagenum)
    delete this.lastcontainer[objnum]

    this.containers[storagenum].finishPath(time, objnum, curclient)
  }

  addPicture(time, objnum, curclient, x, y, width, height, uuid) {
    const storagenum = Math.floor(y) // in Normalized coordinates we have rectangular areas
    this.checkContainerExistsAndDirty(storagenum)
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

  addForm(
    time,
    objnum,
    curclient,
    x,
    y,
    width,
    height,
    type,
    bColor,
    fColor,
    lw
  ) {
    const storagenum = Math.floor(y) // in Normalized coordinates we have rectangular areas
    this.checkContainerExistsAndDirty(storagenum)

    this.containers[storagenum].addForm(
      time,
      objnum,
      curclient,
      x,
      y,
      width,
      height,
      type,
      bColor,
      fColor,
      lw
    )
  }

  deleteObject(time, objnum, curclient, storagenum) {
    if (!Number.isInteger(storagenum)) return
    this.checkContainerExistsAndDirty(storagenum)
    this.containers[storagenum].deleteObject(
      time,
      objnum,
      curclient,
      storagenum
    )
  }

  moveObject(time, objnum, curclient, x, y) {
    const storagenum = Math.floor(y) // in Normalized coordinates we have rectangular areas
    this.checkContainerExistsAndDirty(storagenum)
    this.containers[storagenum].moveObject(time, objnum, curclient, x, y)
  }

  scrollBoard(time, clientnum, x, y) {
    this.commandcontainer.scrollBoard(time, clientnum, x, y)
  }

  startApp(time, x, y, width, height, id, sha, appid) {
    this.jupytercontainer.startApp(time, x, y, width, height, id, sha, appid)
  }

  closeApp(time) {
    this.jupytercontainer.closeApp(time)
  }

  dataApp(time, buffer) {
    this.jupytercontainer.dataApp(time, buffer)
  }

  moveApp(time, x, y, width, height, deactivate) {
    this.jupytercontainer.moveApp(time, x, y, width, height, deactivate)
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

  reparseJupyter(datasink) {
    let pos = 0
    while (pos >= 0) {
      pos = this.jupytercontainer.reparseJupyter(datasink, pos)
    }
  }

  clearContainers() {
    this.containers = []
    this.contdirty = []
    this.dirty = false
    if (this.ondirty) this.ondirty(false)
    this.lasttime = 0

    this.lastcontainer = {}
    this.commandcontainer = this.containertype('command', this.containerconfig)
  }

  replaceStoredData(i, data) {
    if (i === 'command') {
      this.commandcontainer.replaceStoredData(data)
    } else if (i === 'jupyter') {
      this.jupytercontainer.replaceStoredData(data)
    } else {
      if (!(i in this.containers)) {
        this.containers[i] = this.containertype(i, this.containerconfig)
      }
      this.contdirty[i] = false
      this.containers[i].replaceStoredData(data)
      if (this.contdirty.some((el) => !!el)) {
        if (!this.dirty) {
          this.dirty = true
          if (this.ondirty) this.ondirty(true)
        }
      } else {
        if (this.dirty) {
          this.dirty = false
          if (this.ondirty) this.ondirty(false)
        }
      }
    }
  }
}

export class Dispatcher extends Sink {
  constructor() {
    super()
    this.datasinklist = new Set()
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
    this.datasinklist.add(sink)
  }

  removeSink(sink) {
    this.datasinklist.delete(sink)
  }

  startPath(time, objnum, curclient, x, y, type, color, w, pressure) {
    // console.log("FDD sP",this);
    if (this.blocked) return
    // var object=this.fixObjNumber(objnum);
    const object = objnum
    // console.log("FDD startPath",time,objnum,curclient,x,y,w,color);

    let timeset = time
    if (!timeset) timeset = now() - this.starttime

    let client = curclient
    if (!client) client = this.curclientnum
    // console.log("FDD startPath2",timeset,object,client,x,y,w,color);
    this.datasinklist.forEach((sink) =>
      sink.startPath(timeset, object, client, x, y, type, color, w, pressure)
    )
  }

  addToPath(time, objnum, curclient, x, y, pressure) {
    // console.log("FDD aTP",this);
    if (this.blocked) return
    let client = curclient
    if (!curclient) client = this.curclientnum
    let timeset = time
    if (!timeset) timeset = now() - this.starttime

    this.datasinklist.forEach((sink) =>
      sink.addToPath(timeset, objnum, client, x, y, pressure)
    )
  }

  finishPath(time, objnum, curclient) {
    // console.log("FDD fP",this);
    if (this.blocked) return
    let client = curclient
    if (!curclient) client = this.curclientnum
    let timeset = time
    if (!timeset) timeset = now() - this.starttime

    this.datasinklist.forEach((sink) =>
      sink.finishPath(timeset, objnum, client)
    )
  }

  scrollBoard(time, clientnum, x, y) {
    this.setTimeandScrollPos(time, x, y)
    let timeset = time
    if (!timeset) timeset = now() - this.starttime
    this.datasinklist.forEach((sink) =>
      sink.scrollBoard(timeset, clientnum, x, y)
    )
  }

  addPicture(time, objnum, curclient, x, y, width, height, uuid) {
    // console.log("addPicture in failsdata dispatcher before blocked");
    if (this.blocked) return
    // var object=this.fixObjNumber(objnum);
    const object = objnum
    // console.log("FDD startPath",time,objnum,curclient,x,y,w,color);

    let timeset = time
    if (!timeset) timeset = now() - this.starttime

    let client = curclient
    if (!client) client = this.curclientnum
    // console.log("addPicture in failsdata dispatcher");

    this.datasinklist.forEach((sink) =>
      sink.addPicture(timeset, object, client, x, y, width, height, uuid)
    )
  }

  addForm(
    time,
    objnum,
    curclient,
    x,
    y,
    width,
    height,
    type,
    bColor,
    fColor,
    lw
  ) {
    if (this.blocked) return
    const object = objnum

    let timeset = time
    if (!timeset) timeset = now() - this.starttime

    let client = curclient
    if (!client) client = this.curclientnum

    this.datasinklist.forEach((sink) =>
      sink.addForm(
        timeset,
        object,
        client,
        x,
        y,
        width,
        height,
        type,
        bColor,
        fColor,
        lw
      )
    )
  }

  deleteObject(time, objnum, curclient, storagenum) {
    if (this.blocked) return
    let client = curclient
    if (!curclient) client = this.curclientnum
    let timeset = time
    if (!timeset) timeset = now() - this.starttime

    this.datasinklist.forEach((sink) =>
      sink.deleteObject(timeset, objnum, client, storagenum)
    )
  }

  moveObject(time, objnum, curclient, x, y) {
    if (this.blocked) return
    let client = curclient
    if (!curclient) client = this.curclientnum
    let timeset = time
    if (!timeset) timeset = now() - this.starttime

    this.datasinklist.forEach((sink) =>
      sink.moveObject(timeset, objnum, client, x, y)
    )
  }

  startApp(time, x, y, width, height, id, sha, appid) {
    if (this.blocked) return
    let timeset = time
    if (!timeset) timeset = now() - this.starttime
    this.datasinklist.forEach((sink) =>
      sink.startApp(time, x, y, width, height, id, sha, appid)
    )
  }

  closeApp(time) {
    if (this.blocked) return
    let timeset = time
    if (!timeset) timeset = now() - this.starttime
    this.datasinklist.forEach((sink) => sink.closeApp(time))
  }

  dataApp(time, buffer) {
    if (this.blocked) return
    let timeset = time
    if (!timeset) timeset = now() - this.starttime
    this.datasinklist.forEach((sink) => sink.dataApp(time, buffer))
  }

  moveApp(time, x, y, width, height, deactivate) {
    if (this.blocked) return
    let timeset = time
    if (!timeset) timeset = now() - this.starttime
    this.datasinklist.forEach((sink) =>
      sink.moveApp(time, x, y, width, height, deactivate)
    )
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

  addForm(
    time,
    objnum,
    curclient,
    x,
    y,
    width,
    height,
    type,
    bColor,
    fColor,
    lw
  ) {
    const outobj = {}
    outobj.task = 'addForm'
    outobj.time = time
    outobj.objnum = objnum
    outobj.curclient = curclient
    outobj.x = x
    outobj.y = y
    outobj.w = width
    outobj.h = height
    outobj.type = type
    outobj.bColor = bColor
    outobj.fColor = fColor
    outobj.lw = lw
    this.sendfunc(outobj)
  }

  scrollBoard(time, clientnum, x, y) {
    const outobj = {}
    outobj.task = 'scrollBoard'
    outobj.time = time
    outobj.clientnum = clientnum
    outobj.x = x
    outobj.y = y
    this.sendfunc(outobj)
  }

  deleteObject(time, objnum, curclient, storagenum) {
    const outobj = {}
    outobj.task = 'deleteObject'
    outobj.time = time
    outobj.objnum = objnum
    outobj.clientnum = curclient
    outobj.storagenum = storagenum
    this.sendfunc(outobj)
  }

  moveObject(time, objnum, curclient, x, y) {
    const outobj = {}
    outobj.task = 'moveObject'
    outobj.time = time
    outobj.objnum = objnum
    outobj.clientnum = curclient
    outobj.x = x
    outobj.y = y
    this.sendfunc(outobj)
  }

  startApp(time, x, y, width, height, id, sha, appid) {
    this.sendfunc({
      task: 'startApp',
      time,
      x,
      y,
      width,
      height,
      id,
      sha,
      appid
    })
  }

  closeApp(time) {
    this.sendfunc({
      task: 'closeApp',
      time
    })
  }

  dataApp(time, buffer) {
    this.sendfunc({
      task: 'dataApp',
      time,
      buffer
    })
  }

  moveApp(time, x, y, width, height, deactivate) {
    return {
      task: 'moveApp',
      time,
      x,
      y,
      width,
      height,
      deactivate
    }
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
        sink.scrollBoard(data.time, data.clientnum, data.x, data.y)

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
      case 'addForm':
        sink.addForm(
          data.time,
          data.objnum,
          data.curclient,
          data.x,
          data.y,
          data.w,
          data.h,
          data.type,
          data.bColor,
          data.fColor,
          data.lw
        )
        break
      case 'deleteObject':
        sink.deleteObject(
          data.time,
          data.objnum,
          data.clientnum,
          data.storagenum
        )
        break
      case 'moveObject':
        sink.moveObject(data.time, data.objnum, data.clientnum, data.x, data.y)
        break
      case 'startApp':
        sink.startApp(
          data.time,
          data.x,
          data.y,
          data.width,
          data.height,
          data.id,
          data.sha,
          data.appid
        )
        break
      case 'closeApp':
        sink.closeApp(data.time)
        break
      case 'dataApp':
        sink.dataApp(data.time, data.buffer)
        break
      case 'moveApp':
        sink.moveApp(
          data.time,
          data.x,
          data.y,
          data.width,
          data.height,
          data.deactivate
        )
    }
  }
}

export class DrawObject {
  constructor(type, objid) {
    this.type = type
    this.version = 0
    this.cacheversion = -1
    this.cacheid = -1
    this.objid = objid
    this.preview = false
    this.selected = false
    this.preshift = null
    this.uncommitted = false // used if the object is copied
  }

  getRenderCache(id) {
    if (this.cacheversion === this.version && this.cacheid === id)
      return this.rendercache
    else this.rendercache = null
    return null
  }

  setRenderCache(id, cache) {
    this.rendercache = cache
    this.cacheid = id
    this.cacheversion = this.version
  }

  clearRenderCache() {
    this.rendercache = null
  }

  setPreshift(shift) {
    if (shift && shift.x !== undefined && shift.y !== undefined) {
      if (
        !this.preshift ||
        this.preshift.x !== shift.x ||
        this.preshift.x !== shift.y
      ) {
        this.clearRenderCache()
        this.preshift = { x: shift.x, y: shift.y }
      }
    } else {
      if (this.preshift) {
        this.clearRenderCache()
        this.preshift = null
      }
    }
  }

  commitPreshift(target) {
    // implement in derived class
  }

  copyAndDeselect(target, shift) {
    // implement in derived class
    // return the copied object
  }

  setPreview(preview) {
    if (this.preview !== preview) {
      this.preview = preview
      this.clearRenderCache()
    }
  }

  getPreview() {
    return this.preview
  }

  getArea() {
    return null
  }

  select() {
    this.selected = true
    this.clearRenderCache()
  }

  isSelected() {
    return this.selected
  }

  deselect() {
    this.selected = false
    this.clearRenderCache()
  }

  storagenum() {
    return null
  }
}

export class DrawObjectPicture extends DrawObject {
  constructor(objid) {
    super('image', objid)
    this.svgscale = 2000 // should be kept constant
  }

  addPicture(x, y, width, height, uuid, url, mimetype, urlthumb) {
    this.posx = x
    this.posy = y
    this.width = width
    this.height = height
    this.uuid = uuid
    this.url = url
    this.urlthumb = urlthumb
    this.mimetype = mimetype
    this.clearRenderCache()
  }

  getWeightSlices(numslicesheight) {
    const toret = []
    const sliceposstart = Math.round(this.posy / numslicesheight)
    const sliceposend = Math.round((this.posy + this.height) / numslicesheight)
    const sliceweight = numslicesheight * this.width * 0.2 // adjust the factor

    for (let slicepos = sliceposstart; slicepos < sliceposend; slicepos++) {
      toret.push({
        weight: sliceweight,
        pos: slicepos,
        min: Math.min(this.posy, this.posy + this.height),
        max: Math.max(this.posy, this.posy + this.height)
      })
    }
    return toret
  }

  moveObject(x, y) {
    this.posx = x
    this.posy = y
    this.preshift = null
    this.clearRenderCache()
  }

  doPointTest(testobj) {
    // four corners
    if (
      !testobj.pointTest({
        x: this.posx * this.svgscale,
        y: this.posy * this.svgscale
      })
    )
      return false
    if (
      !testobj.pointTest({
        x: (this.posx + this.width) * this.svgscale,
        y: this.posy * this.svgscale
      })
    )
      return false
    if (
      !testobj.pointTest({
        x: (this.posx + this.width) * this.svgscale,
        y: (this.posy + this.height) * this.svgscale
      })
    )
      return false
    if (
      !testobj.pointTest({
        x: this.posx * this.svgscale,
        y: (this.posy + this.height) * this.svgscale
      })
    )
      return false
    const dscan = 0.2 // 5 by 5 and yes we double test the corners
    for (let scanx = 0; scanx <= 1.0; scanx += dscan) {
      for (let scany = 0; scany <= 1.0; scany += dscan) {
        if (
          !testobj.pointTest({
            x: (this.posx + this.width * scanx) * this.svgscale,
            y: (this.posy + this.height * scany) * this.svgscale
          })
        )
          return false
      }
    }

    return true
  }

  getArea() {
    return {
      left: Math.min(this.posx, this.posx + this.width),
      right: Math.max(this.posx, this.posx + this.width),
      top: Math.min(this.posy, this.posy + this.height),
      bottom: Math.max(this.posy, this.posy + this.height)
    }
  }

  commitPreshift(target) {
    if (!this.preshift && !this.uncommitted) return
    if (target) {
      const newstorage = Math.floor(this.posy + (this.preshift?.y ?? 0))
      if (newstorage !== this.storagenum() || this.uncommitted) {
        // ok we have to delete the old obj and create a new one
        let newobjid
        if (!this.uncommitted) {
          target.sink.deleteObject(null, this.objid, null, this.storagenum())
          newobjid = target.newobjid(this.objid)
        } else {
          newobjid = this.objid
        }
        target.sink.addPicture(
          null,
          newobjid,
          null,
          this.posx + (this.preshift?.x ?? 0),
          this.posy + (this.preshift?.y ?? 0),
          this.width,
          this.height,
          this.uuid
        )
        target.deselect() // signals that the selection should be removed
        this.uncommitted = false
      } else {
        // ok we just move
        target.sink.moveObject(
          null,
          this.objid,
          null,
          this.posx + (this.preshift?.x ?? 0),
          this.posy + (this.preshift?.y ?? 0)
        )
      }
    }
    this.clearRenderCache()
  }

  copyAndDeselect(target, shift) {
    const newobj = new DrawObjectPicture(target.newobjid(this.objid))
    newobj.uncommitted = true
    newobj.addPicture(
      this.posx + (this.preshift?.x ?? 0) + shift.x,
      this.posy + (this.preshift?.y ?? 0) + shift.y,
      this.width,
      this.height,
      this.uuid,
      this.url,
      this.mimetype,
      this.urlthumb
    )
    this.deselect()
    newobj.select()
    return newobj
  }

  storagenum() {
    return Math.floor(this.posy)
  }
}

export class DrawObjectForm extends DrawObject {
  constructor(objid) {
    super('form', objid)
    this.svgscale = 2000 // should be kept constant
  }

  addForm(x, y, width, height, type, bColor, fColor, lw) {
    this.posx = x
    this.posy = y
    this.width = width
    this.height = height
    this.formtype = type
    this.bColor = bColor
    this.fColor = fColor
    this.lw = lw
    this.clearRenderCache()
  }

  getWeightSlices(numslicesheight) {
    const toret = []
    const sliceposstart = Math.round(this.posy / numslicesheight)
    const sliceposend = Math.round((this.posy + this.height) / numslicesheight)
    let sliceweight
    let opague = false
    if ((this.fColor & 0xff000000) >>> 24 !== 0) opague = true
    // const posx = Math.min(this.posx, this.posx + this.width)
    const posy = Math.min(this.posy, this.posy + this.height)
    const width = Math.abs(this.width)
    const height = Math.abs(this.height)
    switch (this.formtype) {
      case 2: // rectangle
        if (opague) {
          sliceweight = () =>
            (width * numslicesheight) / this.svgscale / this.svgscale
        } else {
          sliceweight = (slicepos) => {
            let weigth =
              (this.lw * numslicesheight) / this.svgscale / this.svgscale
            if (
              (slicepos * numslicesheight < posy &&
                posy <= (slicepos + 1) * numslicesheight) ||
              (slicepos * numslicesheight < posy + height &&
                posy + height <= (slicepos + 1) * numslicesheight)
            )
              weigth += (width * this.lw) / this.svgscale / this.svgscale
            return weigth
          }
        }
        break
      case 3: // circle, actually the same except for manipulation
      case 4: // ellipse
        if (opague) {
          sliceweight = (slicepos) => {
            const yunitcircle =
              ((slicepos + 0.5) * numslicesheight - posy) / (height * 0.5) - 1
            const xunitcircle = Math.sqrt(1 - yunitcircle * yunitcircle)
            return (
              (xunitcircle * 2 * width * numslicesheight) /
              this.svgscale /
              this.svgscale
            )
          }
        } else {
          sliceweight = (slicepos) => {
            const yunitcircle =
              ((slicepos + 0.5) * numslicesheight - posy) / (height * 0.5) - 1
            const liney = numslicesheight
            const linex = Math.abs(yunitcircle) * this.width

            return (
              (Math.sqrt(liney * liney + linex * linex) * this.lw) /
              this.svgscale /
              this.svgscale
            )
          }
        }
        break

      case 1:
      default:
        // line
        if (this.height === 0)
          sliceweight = () => (width * this.lw) / this.svgscale / this.svgscale
        else {
          const m = width / height
          sliceweight = () =>
            (numslicesheight * m) / this.svgscale / this.svgscale
        }
        break
    }

    for (let slicepos = sliceposstart; slicepos < sliceposend; slicepos++) {
      toret.push({
        weight: sliceweight(slicepos),
        pos: slicepos,
        min: posy,
        max: posy + height
      })
    }
    return toret
  }

  moveObject(x, y) {
    this.posx = x
    this.posy = y
    this.preshift = null
    this.clearRenderCache()
  }

  doPointTest(testobj) {
    switch (this.formtype) {
      case 2: // line
        return this.doPointTestRect(testobj)
      case 3: // Circle
      case 4: // Ellipse
        return this.doPointTestEllipseCircle(testobj)
      case 1: // line
      default:
        return this.doPointTestLine(testobj)
    }
  }

  doPointTestEllipseCircle(testobj) {
    const radiusx = Math.abs(this.width) * 0.5
    const radiusy = Math.abs(this.height) * 0.5
    const px = this.posx + this.width * 0.5
    const py = this.posy + this.height * 0.5

    let opague = false
    if ((this.fColor & 0xff000000) >>> 24 !== 0) opague = true

    if (!opague) {
      for (let phi = 0; phi < 2 * Math.PI; phi += (2 * Math.PI) / 20) {
        if (
          !testobj.pointTest({
            x: (px + radiusx * Math.sin(phi)) * this.svgscale,
            y: (py + radiusy * Math.cos(phi)) * this.svgscale
          })
        )
          return false
      }
    } else {
      const dscan = 0.2 // 5 by 5 and yes we double test the corners
      for (let scany = 0; scany <= 1.0; scany += dscan) {
        const yunitcircle = scany * 2 - 1
        const xoffset = 0.5 * (1 - Math.sqrt(1 - yunitcircle * yunitcircle))
        for (let scanx = xoffset; scanx <= 1.0 - xoffset; scanx += dscan) {
          if (
            !testobj.pointTest({
              x: (this.posx + this.width * scanx) * this.svgscale,
              y: (this.posy + this.height * scany) * this.svgscale
            })
          )
            return false
        }
      }
    }

    return true
  }

  doPointTestLine(testobj) {
    const dscan = 0.05 // 20 tests

    for (let scan = 0; scan <= 1.0; scan += dscan) {
      if (
        !testobj.pointTest({
          x: (this.posx + this.width * scan) * this.svgscale,
          y: (this.posy + this.height * scan) * this.svgscale
        })
      )
        return false
    }

    return true
  }

  doPointTestRect(testobj) {
    let opague = false
    if ((this.fColor & 0xff000000) >>> 24 !== 0) opague = true
    // four corners
    if (
      !testobj.pointTest({
        x: this.posx * this.svgscale,
        y: this.posy * this.svgscale
      })
    )
      return false
    if (
      !testobj.pointTest({
        x: (this.posx + this.width) * this.svgscale,
        y: this.posy * this.svgscale
      })
    )
      return false
    if (
      !testobj.pointTest({
        x: (this.posx + this.width) * this.svgscale,
        y: (this.posy + this.height) * this.svgscale
      })
    )
      return false
    if (
      !testobj.pointTest({
        x: this.posx * this.svgscale,
        y: (this.posy + this.height) * this.svgscale
      })
    )
      return false
    const dscan = 0.2 // 5 by 5 and yes we double test the corners
    if (opague) {
      for (let scanx = 0; scanx <= 1.0; scanx += dscan) {
        for (let scany = 0; scany <= 1.0; scany += dscan) {
          if (
            !testobj.pointTest({
              x: (this.posx + this.width * scanx) * this.svgscale,
              y: (this.posy + this.height * scany) * this.svgscale
            })
          )
            return false
        }
      }
    } else {
      let scany, scanx
      // top and bottom
      for (scanx = 0; scanx <= 1.0; scanx += dscan) {
        scany = 0
        if (
          !testobj.pointTest({
            x: (this.posx + this.width * scanx) * this.svgscale,
            y: (this.posy + this.height * scany) * this.svgscale
          })
        )
          return false
        scany = 1.0
        if (
          !testobj.pointTest({
            x: (this.posx + this.width * scanx) * this.svgscale,
            y: (this.posy + this.height * scany) * this.svgscale
          })
        )
          return false
      }
      // left and right
      for (scany = 0; scany <= 1.0; scany += dscan) {
        scanx = 0
        if (
          !testobj.pointTest({
            x: (this.posx + this.width * scanx) * this.svgscale,
            y: (this.posy + this.height * scany) * this.svgscale
          })
        )
          return false
        scanx = 1
        if (
          !testobj.pointTest({
            x: (this.posx + this.width * scanx) * this.svgscale,
            y: (this.posy + this.height * scany) * this.svgscale
          })
        )
          return false
      }
    }

    return true
  }

  getArea() {
    return {
      left: Math.min(this.posx, this.posx + this.width),
      right: Math.max(this.posx, this.posx + this.width),
      top: Math.min(this.posy, this.posy + this.height),
      bottom: Math.max(this.posy, this.posy + this.height)
    }
  }

  commitPreshift(target) {
    if (!this.preshift && !this.uncommitted) return
    if (target) {
      const newstorage = Math.floor(this.posy + (this.preshift?.y ?? 0))
      if (newstorage !== this.storagenum() || this.uncommitted) {
        // ok we have to delete the old obj and create a new one
        let newobjid
        if (!this.uncommitted) {
          target.sink.deleteObject(null, this.objid, null, this.storagenum())
          newobjid = target.newobjid(this.objid)
        } else {
          newobjid = this.objid
        }
        target.sink.addForm(
          null,
          newobjid,
          null,
          this.posx + (this.preshift?.x ?? 0),
          this.posy + (this.preshift?.y ?? 0),
          this.width,
          this.height,
          this.formtype,
          this.bColor,
          this.fColor,
          this.lw
        )
        target.deselect() // signals that the selection should be removed
        this.uncommitted = false
      } else {
        // ok we just move
        target.sink.moveObject(
          null,
          this.objid,
          null,
          this.posx + (this.preshift?.x ?? 0),
          this.posy + (this.preshift?.y ?? 0)
        )
      }
    }
    this.clearRenderCache()
  }

  copyAndDeselect(target, shift) {
    const newobj = new DrawObjectForm(target.newobjid(this.objid))
    newobj.uncommitted = true
    newobj.addForm(
      this.posx + (this.preshift?.x ?? 0) + shift.x,
      this.posy + (this.preshift?.y ?? 0) + shift.y,
      this.width,
      this.height,
      this.formtype,
      this.bColor,
      this.fColor,
      this.lw
    )
    this.deselect()
    newobj.select()
    return newobj
  }

  storagenum() {
    return Math.floor(this.posy)
  }
}

export class DrawObjectGlyph extends DrawObject {
  constructor(objid) {
    super('glyph', objid)
    this.svgscale = 2000 // should be kept constant
    this.isvgscale = 1 / this.svgscale
    this.svgpathversion = -1
    this.svgpathstring = null
    this.stornum = null
  }

  storagenum() {
    return this.stornum
  }

  startPath(x, y, type, color, width, pressure, iscopy) {
    const scolor = Color(color).hex()

    const penwidth = this.svgscale * width

    let penw = penwidth
    let curpress = 0.5
    if (pressure) curpress = pressure
    penw *= curpress * 0.5 * 2 + 0.5

    const px = x * this.svgscale
    const py = y * this.svgscale

    this.stornum = Math.floor(y)

    this.startpoint = { x: px, y: py }
    this.lastpoint = { x: px, y: py }
    this.endpoint = null
    this.gtype = type
    /*  workpathstart: "",
            workpathend:"Z", */
    this.pressure = curpress
    this.pathpoints = [
      { x: px, y: py, w: penw, press: iscopy ? this.pressure : pressure }
    ]
    this.startradius = penw * 0.5
    this.penwidth = penwidth
    this.color = scolor
    this.area = {
      left: -2 * penw,
      right: 2 * penw,
      top: -2 * penw,
      bottom: 2 * penw
    }

    this.version++ // increment version
    this.clearRenderCache()
  }

  addToPath(x, y, pressure, iscopy) {
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
    this.pathpoints.push({
      x: px,
      y: py,
      w: pw,
      press: iscopy ? pressure : this.pressure
    })
    this.area = {
      left: Math.min(px - sx - 2 * pw, ws.left),
      right: Math.max(px - sx + 2 * pw, ws.right),
      top: Math.min(py - sy - 2 * pw, ws.top),
      bottom: Math.max(py - sy + 2 * pw, ws.bottom)
    }
    this.pressure = curpress
    this.version++ // increment version
    this.clearRenderCache()
  }

  finishPath() {
    // so far a nop
    this.version++ // increment version
    this.clearRenderCache()
  }

  moveObject(x, y) {
    if (this.pathpoints && this.pathpoints.length > 0) {
      const rx = x * this.svgscale - this.pathpoints[0].x
      const ry = y * this.svgscale - this.pathpoints[0].y
      for (let ind = 0; ind < this.pathpoints.length; ind++) {
        this.pathpoints[ind].x += rx
        this.pathpoints[ind].y += ry
      }
      if (this.startpoint) {
        this.startpoint.x += rx
        this.startpoint.y += ry
      }
      if (this.lastpoint) {
        this.lastpoint.x += rx
        this.lastpoint.y += ry
      }
      this.version++ // increment version
      this.clearRenderCache()
      this.preshift = null
    }
  }

  doPointTest(testobj) {
    if (!this.pathpoints || this.pathpoints.length === 0) return false
    if (!testobj.pointTest(this.pathpoints[0])) return false
    if (this.pathpoints.length === 1) return true
    if (!testobj.pointTest(this.pathpoints[this.pathpoints.length - 1]))
      return false

    return this.intDoPointTest(testobj, 0, this.pathpoints.length, 8)
  }

  intDoPointTest(testobj, lower, upper, stack) {
    const middle = lower + Math.floor((upper - lower) * 0.5)
    if (middle === lower) return true // none left
    if (!testobj.pointTest(this.pathpoints[middle])) return false

    if (stack === 0) return true
    const half1 = this.intDoPointTest(testobj, lower, middle, stack - 1)
    const half2 = this.intDoPointTest(testobj, middle, upper, stack - 1)
    if (!half1 || !half2) return false
    return true
  }

  commitPreshift(target) {
    if (!this.preshift && !this.uncommitted) return
    if (target && this.pathpoints.length > 0) {
      const newstorage = Math.floor(
        (this.preshift?.y ?? 0) + this.pathpoints[0].y * this.isvgscale
      )
      const oldstorage = this.storagenum()
      if (newstorage !== oldstorage || this.uncommitted) {
        // ok we have to delete the old obj and create a new one
        this.stornum = newstorage
        let newobjid
        if (!this.uncommitted) {
          newobjid = target.newobjid(this.objid)
        } else {
          newobjid = this.objid
        }
        target.sink.startPath(
          null,
          newobjid,
          null,
          this.pathpoints[0].x * this.isvgscale + (this.preshift?.x ?? 0),
          this.pathpoints[0].y * this.isvgscale + (this.preshift?.y ?? 0),
          this.gtype,
          Color(this.color).rgbNumber(),
          this.penwidth * this.isvgscale,
          this.pathpoints[0].press,
          true /* iscopy */
        )
        for (let i = 1; i < this.pathpoints.length; i++) {
          target.sink.addToPath(
            null,
            newobjid,
            null,
            this.pathpoints[i].x * this.isvgscale + (this.preshift?.x ?? 0),
            this.pathpoints[i].y * this.isvgscale + (this.preshift?.y ?? 0),
            this.pathpoints[i].press,
            true /* iscopy */
          )
        }
        target.sink.finishPath(null, newobjid, target.clientnum)
        if (!this.uncommitted)
          target.sink.deleteObject(null, this.objid, null, oldstorage)
        target.deselect() // signals that the selection should be removed
        this.uncommitted = false
      } else {
        // ok we just move
        target.sink.moveObject(
          null,
          this.objid,
          null,
          this.pathpoints[0].x * this.isvgscale + (this.preshift?.x ?? 0),
          this.pathpoints[0].y * this.isvgscale + (this.preshift?.y ?? 0)
        )
      }
    }
    this.clearRenderCache()
  }

  copyAndDeselect(target, shift) {
    const newobj = new DrawObjectGlyph(target.newobjid(this.objid))
    newobj.uncommitted = true
    newobj.startPath(
      this.pathpoints[0].x * this.isvgscale + (this.preshift?.x ?? 0) + shift.x,
      this.pathpoints[0].y * this.isvgscale + (this.preshift?.y ?? 0) + shift.y,
      this.gtype,
      Color(this.color).rgbNumber(),
      this.penwidth * this.isvgscale,
      this.pathpoints[0].press,
      true /* iscopy */
    )
    for (let i = 1; i < this.pathpoints.length; i++) {
      newobj.addToPath(
        this.pathpoints[i].x * this.isvgscale +
          (this.preshift?.x ?? 0) +
          shift.x,
        this.pathpoints[i].y * this.isvgscale +
          (this.preshift?.y ?? 0) +
          shift.y,
        this.pathpoints[i].press,
        true /* iscopy */
      )
    }
    newobj.finishPath()
    newobj.select()
    this.deselect()
    return newobj
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
        if (norm > 0) {
          dx *= 1 / norm
          dy *= 1 / norm
        }
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

  getWeightSlices(numslicesheight) {
    const glyph = this
    const toret = []
    const lastpoint = glyph.pathpoints[0]
    for (let i = 1; i < glyph.pathpoints.length; i++) {
      const curpoint = glyph.pathpoints[i]
      if (isNaN(curpoint.x) || isNaN(curpoint.y) || isNaN(curpoint.w)) continue
      const weight =
        (Math.sqrt(
          (lastpoint.x - curpoint.x) * (lastpoint.x - curpoint.x) +
            (lastpoint.y - curpoint.y) * (lastpoint.y - curpoint.y)
        ) *
          curpoint.w) /
        this.svgscale /
        this.svgscale
      const slicepos = Math.round(
        ((lastpoint.y + curpoint.y) * 0.5) / this.svgscale / numslicesheight
      )
      toret.push({
        weight: weight,
        pos: slicepos,
        min: (curpoint.y - curpoint.w) / this.svgscale,
        max: (curpoint.y + curpoint.w) / this.svgscale
      })
    }

    return toret
  }

  getArea() {
    const sx = this.startpoint.x
    const sy = this.startpoint.y
    return {
      left: (this.area.left + sx) * this.isvgscale,
      right: (this.area.right + sx) * this.isvgscale,
      top: (this.area.top + sy) * this.isvgscale,
      bottom: (this.area.bottom + sy) * this.isvgscale
    }
  }
}

export class DrawObjectContainer extends Sink {
  constructor(args) {
    super()
    if (args && args.info && args.info.usedpictures)
      this.pictures = args.info.usedpictures
    else this.pictures = []
    this.resetDrawing()
  }

  resetDrawing() {
    this.objects = []
    this.workobj = {}
  }

  addPicture(time, objnum, curclient, x, y, width, height, uuid) {
    const pictinfo = this.pictures.find((el) => el.sha === uuid)

    const addpict = new DrawObjectPicture(objnum)

    addpict.addPicture(
      x,
      this.yoffset ? y - this.yoffset : y,
      width,
      height,
      uuid,
      pictinfo ? pictinfo.url : null,
      pictinfo ? pictinfo.mimetype : null,
      pictinfo ? pictinfo.urlthumb : null
    )

    this.objects.push(addpict)
  }

  addForm(
    time,
    objnum,
    curclient,
    x,
    y,
    width,
    height,
    type,
    bColor,
    fColor,
    lw
  ) {
    const addform = new DrawObjectForm(objnum)

    addform.addForm(
      x,
      this.yoffset ? y - this.yoffset : y,
      width,
      height,
      type,
      bColor,
      fColor,
      lw
    )

    this.objects.push(addform)
  }

  startPath(time, objnum, curclient, x, y, type, color, w, pressure) {
    this.workobj[objnum] = new DrawObjectGlyph(objnum)
    this.objects.push(this.workobj[objnum])
    this.workobj[objnum].startPath(
      x,
      this.yoffset ? y - this.yoffset : y,
      type,
      color,
      w,
      pressure
    )
  }

  addToPath(time, objid, curclient, x, y, pressure) {
    if (this.workobj[objid]) {
      // TODO handle objid
      this.workobj[objid].addToPath(
        x,
        this.yoffset ? y - this.yoffset : y,
        pressure
      )
    }
  }

  finishPath(time, objid, curclient) {
    if (this.workobj[objid]) {
      this.workobj[objid].finishPath()
      delete this.workobj[objid]
    }
  }

  scrollBoard(time, x, y) {
    // do ... nothing....
  }

  deleteObject(time, objnum, curclient, storagenum) {
    if (this.workobj[objnum]) {
      delete this.workobj[objnum]
    }
    this.objects = this.objects.filter((el) => el.objid !== objnum)
  }

  moveObject(time, objnum, curclient, x, y) {
    if (!this.objects) return
    this.objects.forEach((el) => {
      if (el.objid === objnum) {
        el.moveObject(x, this.yoffset ? y - this.yoffset : y)
      }
    })
  }
}

// this object determines the area covered with drawings, New Implementation
// it is used for finding the best position for a pagebreak in a pdf
// TODO rewrite using objects
export class DrawArea3 extends DrawObjectContainer {
  constructor(args) {
    super(args)
    this.numslicesheight = (1.41 * 3) / 297 // the slice height to be roughly 3 mm
    this.slices = []

    this.newx = 0
    this.newy = 0
    this.curw = 0
    this.intervals = []

    this.glomin = 0
    this.glomax = 0

    this.addSlice = this.addSlice.bind(this)
  }

  addSlice(slice) {
    this.weightscalculated = false
    if (typeof this.slices[slice.spos] === 'undefined')
      this.slices[slice.pos] = slice.weight
    else this.slices[slice.pos] += slice.weight
    this.glomin = Math.min(this.glomin, slice.min)
    this.glomax = Math.max(this.glomax, slice.max)
  }

  calculateWeights() {
    for (let ind = 0; ind < this.objects.length; ind++) {
      if (this.objects[ind]) {
        const slices = this.objects[ind].getWeightSlices(this.numslicesheight)
        slices.forEach(this.addSlice)
      }
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
