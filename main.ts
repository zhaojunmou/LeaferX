import { Rect, App, Text, Line, Box, PointerEvent, Group } from 'leafer-ui'
import { EditorMoveEvent } from './src/event/EditorMoveEvent'
import { EditorEvent } from './src/event/EditorEvent'
import { EditSelect } from './src/display/EditSelect'
import { Editor } from './src' // 引入插件代码

// const leafer = new Leafer({ view: window })
const app = new App({
  view: window,
})

app.tree = app.addLeafer()
app.sky = app.addLeafer({ type: 'draw', usePartRender: false })

const editor = (app.editor = new Editor())

const creator = new Group({
  visible: false,
  children: [
    {
      tag: 'Rect',
      width: app.width,
      height: app.height,
      x: 0,
      y: 0,
      fill: 'rgba(0,0,0,0.5)',
    },
  ],
})

app.sky.addMany(editor, creator)

app.on(PointerEvent.DOWN, (e: PointerEvent) => {
  creator.visible = !creator.visible
})

const rect1 = new Rect({
  x: 100,
  y: 100,
  width: 100,
  height: 100,
  fill: '#32cd79',
  editable: true,
})
const rect2 = new Rect({
  x: 150,
  y: 150,
  width: 100,
  height: 100,
  fill: '#7932cd',
  editable: true,
})

const line1 = new Line({
  points: [30, 10, 50, 36, 70, 10, 112, 60],
  curve: 0.5,
  strokeWidth: 3,
  stroke: '#3279cd',
  editable: true,
})

const line2 = new Line({
  x: 100,
  y: 80,
  width: 200,
  strokeWidth: 3,
  stroke: '#9c327d',
  editable: true,
})

const x = new Text({
  text: 'x:',
})
const y = new Text({
  text: 'y:',
  y: 20,
})

const button = new Box({
  x: 500,
  y: 40,
  fill: 'blue',
  cornerRadius: 20,
  children: [
    {
      tag: 'Text',
      text: 'button',
      padding: [8, 14],
      fill: '#ffffff',
    },
  ],
})

const selectCount = new Text({
  text: 'count:',
  y: 40,
})

button.on(PointerEvent.DOWN, (e) => {
  // if(!editor.selector.destroyed){
  //     console.log(editor.selector)
  //     app.tree.lockLayout()
  //     editor.selector.destroy()
  //     editor.update()
  // }else{
  //     console.log('createSelector')
  //     editor.selector = new EditSelect(editor)
  //     editor.update()
  // }
  // console.log(app.sky)
  // app.sky = new Leafer({type: 'draw'})
})

editor.on(EditorMoveEvent.MOVE, (e) => {
  x.text = 'x:' + e.target.x
  y.text = 'y:' + e.target.y
})

editor.on(EditorEvent.SELECT, (e) => {
  selectCount.text = 'count:' + e.editor.list.length
})

app.tree.addMany(rect1, rect2, line1, line2, x, y, selectCount, button)
