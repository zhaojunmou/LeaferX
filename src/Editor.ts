import { IGroupInputData, IUI, IEventListenerId, IPointData, ILeafList, IEditSize, IGroup } from '@leafer-ui/interface'
import { Group, Rect, DragEvent, RotateEvent, DataHelper, MathHelper, LeafList, Matrix, RenderEvent, KeyEvent } from '@leafer-ui/core'

import { IEditBox, IEditPoint, IEditor, IEditorConfig, IEditTool, IEditorScaleEvent } from '@leafer-in/interface'

import { EditorMoveEvent } from './event/EditorMoveEvent'
import { EditorScaleEvent } from './event/EditorScaleEvent'
import { EditorRotateEvent } from './event/EditorRotateEvent'
import { EditorSkewEvent } from './event/EditorSkewEvent'

import { EditSelect } from './display/EditSelect'
import { EditBox } from './display/EditBox'

import { config } from './config'
import { getEditTool } from './tool'

import { onTarget, onHover } from './editor/target'
import { targetAttr } from './decorator/data'
import { EditorHelper } from './helper/EditorHelper'
import { EditDataHelper } from './helper/EditDataHelper'
import { updateCursor } from './editor/cursor'


export class Editor extends Group implements IEditor {

    public config = config

    @targetAttr(onHover)
    public hoverTarget: IUI

    @targetAttr(onTarget)
    public target: IUI | IUI[]

    public leafList: ILeafList = new LeafList() // from target
    public get list(): IUI[] { return this.leafList.list as IUI[] }

    public get hasTarget(): boolean { return !!this.list.length }
    public get multiple(): boolean { return this.list.length > 1 }
    public get single(): boolean { return this.list.length === 1 }

    public get element() { return this.multiple ? this.simulateTarget : this.list[0] as IUI }
    public simulateTarget: IUI = new Rect({ visible: false })

    public editBox: IEditBox = new EditBox(this)
    public get buttons() { return this.editBox.buttons }

    public editTool: IEditTool
    public selector: EditSelect = new EditSelect(this)

    public get dragging(): boolean { return this.editBox.dragging }

    public targetEventIds: IEventListenerId[] = []


    constructor(userConfig?: IEditorConfig, data?: IGroupInputData) {
        super(data)
        if (userConfig) this.config = DataHelper.default(userConfig, this.config)
        this.addMany(this.selector, this.editBox)
    }

    // item

    public hasItem(item: IUI): boolean {
        return this.leafList.has(item)
    }

    public addItem(item: IUI): void {
        if (!this.hasItem(item) && !item.locked) this.leafList.add(item), this.target = this.leafList.list as IUI[]
    }

    public removeItem(item: IUI): void {
        if (this.hasItem(item)) this.leafList.remove(item), this.target = this.leafList.list as IUI[]
    }

    public shiftItem(item: IUI): void {
        this.hasItem(item) ? this.removeItem(item) : this.addItem(item)
    }

    // update

    public update(): void {
        if (this.target) {
            if (this.editTool) this.editTool.update(this)
            this.selector.update()
        }
    }

    public updateEditTool(): void {
        this.editTool = getEditTool(this.list)
    }

    // get

    public getEditSize(ui: IUI): IEditSize {
        let { editSize } = this.config
        return editSize === 'auto' ? ui.editSize : editSize
    }

    // operate

    public onMove(e: DragEvent): void {
        const move = e.getLocalMove(this.element)

        if (e.shiftKey) {
            if (Math.abs(move.x) > Math.abs(move.y)) move.y = 0
            else move.x = 0
        }

        this.move(move.x, move.y)
    }

    public onScale(e: DragEvent): void {
        const { element } = this
        const { direction } = e.current as IEditPoint

        let { around, lockRatio } = this.config
        if (e.shiftKey) lockRatio = true

        const data = EditDataHelper.getScaleData(element.boxBounds, direction, e.getInnerMove(element), lockRatio, EditDataHelper.getAround(around, e.altKey))

        if (this.editTool.onScaleWithDrag) {
            data.drag = e
            this.scaleWithDrag(data)
        } else {
            this.scaleOf(data.origin, data.scaleX, data.scaleY)
        }

    }

    public onRotate(e: DragEvent | RotateEvent): void {
        const { skewable, around, rotateGap } = this.config
        const { direction, name } = e.current as IEditPoint
        if (skewable && name === 'resize-line') return this.onSkew(e as DragEvent)

        const { element } = this
        let origin: IPointData, rotation: number

        if (e instanceof RotateEvent) {
            rotation = e.rotation, origin = element.getInnerPoint(e)
        } else {
            const last = { x: e.x - e.moveX, y: e.y - e.moveY }
            const data = EditDataHelper.getRotateData(element.boxBounds, direction, e.getInner(element), element.getInnerPoint(last), e.shiftKey ? null : (around || 'center'))
            rotation = data.rotation
            origin = data.origin
        }

        rotation = MathHelper.getGapRotation(rotation, rotateGap, element.rotation)
        if (!rotation) return

        if (element.scaleX * element.scaleY < 0) rotation = -rotation // flippedOne

        this.rotateOf(origin, MathHelper.float(rotation, 2))
    }


    public onSkew(e: DragEvent): void {
        const { element } = this
        const { around } = this.config

        const { origin, skewX, skewY } = EditDataHelper.getSkewData(element.boxBounds, (e.current as IEditPoint).direction, e.getInnerMove(element), EditDataHelper.getAround(around, e.altKey))
        if (!skewX && !skewY) return

        this.skewOf(origin, skewX, skewY)
    }


    // transform

    public move(x: number, y: number): void {
        const { element } = this
        const world = element.getWorldPointByLocal({ x, y }, null, true)
        const event = new EditorMoveEvent(EditorMoveEvent.MOVE, { target: element, editor: this, moveX: world.x, moveY: world.y })

        this.editTool.onMove(event)
        this.emitEvent(event)

        if (this.multiple) element.move(x, y)
    }

    public scaleWithDrag(data: IEditorScaleEvent): void {
        const { element } = this
        const worldOrigin = element.getWorldPoint(data.origin)
        const event = new EditorScaleEvent(EditorScaleEvent.SCALE, { ...data, target: element, editor: this, worldOrigin })

        this.editTool.onScaleWithDrag(event)
        this.emitEvent(event)
    }


    public scaleOf(origin: IPointData, scaleX: number, scaleY = scaleX, _resize?: boolean): void {
        const { element } = this
        const worldOrigin = element.getWorldPoint(origin)

        let transform: Matrix

        if (this.multiple) {
            const oldMatrix = new Matrix(element.worldTransform)
            element.scaleOf(origin, scaleX, scaleY)
            transform = new Matrix(element.worldTransform).divide(oldMatrix) // world change transform
        }

        const event = new EditorScaleEvent(EditorScaleEvent.SCALE, { target: element, editor: this, worldOrigin, scaleX, scaleY, transform })

        this.editTool.onScale(event)
        this.emitEvent(event)
    }

    public rotateOf(origin: IPointData, rotation: number): void {
        const { element } = this
        const worldOrigin = element.getWorldPoint(origin)


        let transform: Matrix

        if (this.multiple) {
            const oldMatrix = new Matrix(element.worldTransform)
            element.rotateOf(origin, rotation)
            transform = new Matrix(element.worldTransform).divide(oldMatrix) // world change transform
        }

        const event = new EditorRotateEvent(EditorRotateEvent.ROTATE, { target: element, editor: this, worldOrigin, rotation, transform })

        this.editTool.onRotate(event)
        this.emitEvent(event)
    }

    public skewOf(origin: IPointData, skewX: number, skewY = 0, _resize?: boolean): void {
        const { element } = this
        const worldOrigin = element.getWorldPoint(origin)

        let transform: Matrix

        if (this.multiple) {
            const oldMatrix = new Matrix(element.worldTransform)
            element.skewOf(origin, skewX, skewY)
            transform = new Matrix(element.worldTransform).divide(oldMatrix) // world change transform
        }

        const event = new EditorSkewEvent(EditorSkewEvent.SKEW, {
            target: element, editor: this, skewX, skewY, transform, worldOrigin
        })

        this.editTool.onSkew(event)
        this.emitEvent(event)
    }

    // group

    public group(userGroup?: IGroup | IGroupInputData): IGroup {
        if (this.multiple) this.target = EditorHelper.group(this.list, this.element, userGroup)
        return this.target as IGroup
    }


    public ungroup(): IUI[] {
        if (this.list.length) this.target = EditorHelper.ungroup(this.list)
        return this.list
    }

    // lock

    public lock(): void {
        this.list.forEach(leaf => leaf.locked = true)
        this.update()
    }

    public unlock(): void {
        this.list.forEach(leaf => leaf.locked = false)
        this.update()
    }

    // level

    public toTop(): void {
        if (this.list.length) {
            EditorHelper.toTop(this.list)
            this.leafList.update()
        }
    }

    public toBottom(): void {
        if (this.list.length) {
            EditorHelper.toBottom(this.list)
            this.leafList.update()
        }
    }

    // event 

    public listenTargetEvents(): void {
        if (!this.targetEventIds.length) {
            const { leafer } = this.list[0]
            this.targetEventIds = [
                leafer.on_(RenderEvent.START, this.update, this),
                leafer.on_([KeyEvent.HOLD, KeyEvent.UP], (e: KeyEvent) => { updateCursor(this, e) }),
                leafer.on_(KeyEvent.DOWN, this.editBox.onArrow, this.editBox)
            ]
        }
    }

    public removeTargetEvents(): void {
        const { targetEventIds } = this
        if (targetEventIds.length) {
            this.off_(targetEventIds)
            targetEventIds.length = 0
        }
    }

    public destroy(): void {
        if (!this.destroyed) {
            this.simulateTarget.destroy()
            this.target = this.hoverTarget = this.simulateTarget = null
            super.destroy()
        }
    }

}