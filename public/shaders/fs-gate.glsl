uniform sampler2D texture;

varying vec2 vUV;

void main()
{
    vec4 pixel = texture2D(texture, vUV);

    gl_FragColor = pixel;
}
