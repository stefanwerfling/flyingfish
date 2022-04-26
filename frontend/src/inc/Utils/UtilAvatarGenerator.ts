/**
 * UtilAvatarGenerator
 */
export class UtilAvatarGenerator {

    /**
     * generateAvatar
     * @param text
     * @param foregroundColor
     * @param backgroundColor
     */
    public static generateAvatar(text: string, foregroundColor: string, backgroundColor: string): string {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = 200;
        canvas.height = 200;

        if (context) {
            // Draw background
            context.fillStyle = backgroundColor;
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Draw text
            context.font = 'bold 100px Assistant';
            context.fillStyle = foregroundColor;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, canvas.width / 2, canvas.height / 2);
        }

        return canvas.toDataURL('image/png');
    }

}