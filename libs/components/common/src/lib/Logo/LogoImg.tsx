import type { CSSProperties } from 'react';

export const LogoImg = ({ style = {} }: { style: CSSProperties }) => {
    return (
        <img
            style={style}
            src="data:image/png;base64,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"
            alt="AFFiNE Logo"
        />
    );
};
