Shader "Unlit/ToonOutlineShader"
{
    // User Variables
    Properties
    {
    
    }
    SubShader
    {
        // Values for Unity rendering attributes. Separated by whitespace.
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline"}
        
        // Shader to do each frame
        Pass
        {
            // Defines language type (This one is HLSL)
            HLSLPROGRAM

            // Function declarations
            #pragma vertex vert
            #pragma fragment frag

            // Core library from universal render pipeline
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            // Struct definitions
            // 1# Struct for vert
            struct App
            {
                // Object Space (Relative to Scene's Origin Point)
    float4 positionOS : POSITION;
    half3 normal : NORMAL;
    
            };
            // 2# Struct for frag
            struct v2f
            {
            // Homogoneous clip space (-1 to 1 coordinates). Takes initial value from vertex shader's position.
    float4 positionHCS : SV_POSITION;
    half3 normal : TEXCOORD0; // Texture coords (UVs)
half3 worldPos : TEXCOORD1; // Texture worldspace coords (UVs)
half3 viewDir : TEXCOORD2; // Direction from camera to fragment to shade

    
            };
            // Vertex Shader
v2f vert(App IN)
{
    v2f OUT;
    
    OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz); //Unity function to convert
    OUT.normal = TransformObjectToWorldNormal(IN.normal); //Unity function to convert
    OUT.worldPos = mul(unity_ObjectToWorld, IN.positionOS); // Matrix multiplication using unity's built in matrix
    OUT.viewDir = normalize(GetWorldSpaceViewDir(OUT.worldPos)); //Unity built in function
    
    return OUT;
}
            // Fragment Shader

half4 frag(v2f IN) : SV_Target
{
    /*
    * Concept : Find vertex's normal that's perpendicular to camera. Use that to draw the toon outline.
    */
    float dotProduct = dot(IN.normal, IN.viewDir);
    dotProduct = step(0.5, dotProduct); // Clamp value below and above treshhold. (0.0-1.0 to 0 OR 1)
    
    half3 fillColor = IN.normal * 0.5 + 0.5; //Get vertex normal, then clamp from -1 - 1 into 0.0 - 1 (turn to rgb)
    
    half3 finalColor = fillColor * dotProduct;
    
    return half4(finalColor, 1.0);  
    
}

            ENDHLSL
        }
    }
}
