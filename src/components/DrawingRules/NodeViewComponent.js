import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

const NodeViewComponent = ({ node, getPos, editor }) => {
    const handleAdd = () => {
        const pos = getPos();
        editor.chain().focus().insertContentAt(pos + node.nodeSize, {
            type: 'paragraph',
            content: []
        }).run();
    };

    return (
        <NodeViewWrapper className="node-view-wrapper">
            <div className="node-view-content">
                <IconButton
                    className="drag-handle"
                    contentEditable={false}
                    draggable={true}
                    data-drag-handle
                    size="small"
                >
                    <DragIndicatorIcon />
                </IconButton>
                <NodeViewContent className="content" />
                <IconButton
                    className="add-button"
                    onClick={handleAdd}
                    contentEditable={false}
                    size="small"
                >
                    <AddIcon />
                </IconButton>
            </div>
        </NodeViewWrapper>
    );
};

export default NodeViewComponent; 