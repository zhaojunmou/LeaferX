import { describe, expect, test } from 'vitest'

import { Editor } from "../src"


describe('editor', () => {

    test('is Group', () => {

        const editor = new Editor()
        expect(editor.children).toBeTruthy()

    })

    test('async: is Group', async () => {
        await new Promise(function (resolve) {

            const editor = new Editor()
            expect(editor.children).toBeTruthy()
            resolve(true)
        })

    })

})