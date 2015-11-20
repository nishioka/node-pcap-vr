#define PI 3.14159265358979
#define PI2 6.28318530717959

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 vViewPosition;

uniform float uSphereRadius2;

void main()
{
    vUV = uv;

    vec3 newPosition = position;
    // set the position to be on a sphere centered at the origin
    newPosition.z = sqrt(uSphereRadius2 * uSphereRadius2 -
            newPosition.x * newPosition.x - newPosition.y * newPosition.y);
    // Offset the surface so the center stays in view. Could be done in step above.
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
